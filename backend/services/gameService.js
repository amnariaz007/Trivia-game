const { Game, User, Question, GamePlayer, PlayerAnswer } = require('../models');
const queueService = require('./queueService');
const rewardService = require('./rewardService');
const whatsappService = require('./whatsappService');

class GameService {
  constructor() {
    this.activeGames = new Map(); // In-memory game state
  }

  // Restore active games from database on server startup
  async restoreActiveGames() {
    try {
      console.log('🔄 Restoring active games from database...');
      
      const activeGames = await Game.findAll({
        where: { status: 'in_progress' },
        include: [
          { model: Question, as: 'questions', order: [['question_order', 'ASC']] },
          { 
            model: GamePlayer, 
            as: 'players',
            include: [{ model: User, as: 'user' }]
          }
        ]
      });

      for (const game of activeGames) {
        console.log(`🔄 Restoring game: ${game.id}`);
        
        // Convert database models to in-memory format
        const gameState = {
          id: game.id,
          status: game.status,
          currentQuestion: game.current_question || 0,
          questions: game.questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            time_limit: q.time_limit || 10
          })),
          players: game.players.map(p => ({
            user: {
              id: p.user.id,
              nickname: p.user.nickname,
              whatsapp_number: p.user.whatsapp_number
            },
            status: p.status,
            answer: null, // Reset answers since we can't restore them
            answerTime: null
          })),
          startTime: game.start_time || new Date(),
          questionTimer: null
        };

        this.activeGames.set(game.id, gameState);
        console.log(`✅ Restored game ${game.id} with ${gameState.players.length} players`);
      }

      console.log(`✅ Restored ${activeGames.length} active games`);
      
    } catch (error) {
      console.error('❌ Error restoring active games:', error);
    }
  }

  // Generate timer bar visualization
  generateTimerBar(seconds) {
    const totalBlocks = 10;
    const filledBlocks = Math.ceil((seconds / 10) * totalBlocks);
    return '■'.repeat(filledBlocks) + '□'.repeat(totalBlocks - filledBlocks);
  }

  // Start a new game
  async startGame(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [
          { model: Question, as: 'questions' },
          { model: GamePlayer, as: 'players', include: [{ model: User, as: 'user' }] }
        ]
      });

      if (!game) {
        throw new Error('Game not found');
      }

      // Update game status
      game.status = 'in_progress';
      game.start_time = new Date();
      await game.save();

      // Only include players who have actively joined (status: 'registered' or 'alive')
      const activePlayers = game.players.filter(player => 
        player.status === 'registered' || player.status === 'alive'
      );

      if (activePlayers.length === 0) {
        throw new Error('No players have joined this game. Game cannot start.');
      }

      // Update all joined players to 'alive' status in database
      await GamePlayer.update(
        { status: 'alive' },
        { 
          where: { 
            game_id: gameId,
            status: 'registered'
          } 
        }
      );

      // Initialize game state with proper structure
      const gameState = {
        gameId,
        currentQuestion: 0,
        questions: game.questions,
        players: activePlayers.map(player => ({
          ...player.toJSON(),
          status: 'alive',
          answer: null,
          answerTime: null,
          eliminatedAt: null,
          eliminatedOnQuestion: null,
          eliminationReason: null
        })),
        startTime: new Date(),
        questionTimer: null
      };

      this.activeGames.set(gameId, gameState);

      // Send game start message to all players
      await this.sendGameStartMessage(gameId);

      // Start first question after 5 seconds
      setTimeout(() => {
        this.startQuestion(gameId, 0);
      }, 5000);

      console.log(`🎮 Game ${gameId} started with ${gameState.players.length} players`);
      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  // Start a specific question
  async startQuestion(gameId, questionIndex) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      const { questions, players } = gameState;

      if (questionIndex >= questions.length) {
        // Game finished
        console.log(`🏁 All questions completed for game ${gameId}`);
        await this.endGame(gameId);
        return;
      }

      const question = questions[questionIndex];
      gameState.currentQuestion = questionIndex;
      gameState.questionStartTime = new Date();

      // Reset player answer states for new question
      for (const player of players) {
        if (player.status === 'alive') {
          player.answer = null;
          player.answerTime = null;
        }
      }

      // Update game in database
      const game = await Game.findByPk(gameId);
      game.current_question = questionIndex;
      await game.save();

      // Send question to all alive players
      for (const player of players) {
        if (player.status === 'alive') {
          await queueService.addMessage('send_question', {
            to: player.user.whatsapp_number,
            gameId,
            questionNumber: questionIndex + 1,
            questionText: question.question_text,
            options: [question.option_a, question.option_b, question.option_c, question.option_d],
            correctAnswer: question.correct_answer,
            timeLimit: 10
          });
        }
      }

      // Start countdown timer
      await this.startQuestionTimer(gameId, questionIndex, 10);

      console.log(`❓ Question ${questionIndex + 1} started for game ${gameId}`);

    } catch (error) {
      console.error('❌ Error starting question:', error);
      throw error;
    }
  }

  // Start question timer
  async startQuestionTimer(gameId, questionIndex, totalSeconds) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) return;

    let timeLeft = totalSeconds;
    
    // Send initial timer
    await this.sendTimerUpdate(gameId, questionIndex, timeLeft);

    // Timer countdown
    const timer = setInterval(async () => {
      timeLeft--;
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        console.log(`⏰ Question ${questionIndex + 1} time expired`);
        await this.handleQuestionTimeout(gameId, questionIndex);
        return;
      }

      // Send timer updates at key moments
      if (timeLeft === 5 || timeLeft === 2) {
        await this.sendTimerUpdate(gameId, questionIndex, timeLeft);
      }

    }, 1000);

    // Store timer reference
    gameState.questionTimer = timer;
  }

  // Handle question timeout
  async handleQuestionTimeout(gameId, questionIndex) {
    try {
      console.log(`⏰ Question ${questionIndex + 1} timeout - processing eliminations`);
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        console.log(`❌ Game state not found for ${gameId} during timeout`);
        return;
      }

      const game = await Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });

      const question = game.questions[questionIndex];
      const correctAnswer = question.correct_answer;

      // Eliminate players who haven't answered
      for (const player of gameState.players) {
        if (player.status === 'alive' && !player.answer) {
          player.status = 'eliminated';
          
          // Send elimination message
          await queueService.addMessage('send_elimination', {
            to: player.user.whatsapp_number,
            correctAnswer,
            isCorrect: false
          });
        }
      }

      // Send results to all players (this will handle game continuation)
      await this.sendQuestionResults(gameId, questionIndex, correctAnswer);

    } catch (error) {
      console.error('❌ Error handling question timeout:', error);
    }
  }

    // Handle player answer
  async handlePlayerAnswer(gameId, phoneNumber, answer) {
    try {
      console.log(`🎯 handlePlayerAnswer called: gameId=${gameId}, phone=${phoneNumber}, answer="${answer}"`);
      
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        console.log(`❌ Game not found: ${gameId}`);
        throw new Error('Game not found or not active');
      }

      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (!player) {
        console.log(`❌ Player not found: ${phoneNumber}`);
        throw new Error('Player not found in game');
      }

      console.log(`👤 Player found: ${player.user.nickname}, status: ${player.status}, hasAnswer: ${!!player.answer}`);

      if (player.status !== 'alive') {
        console.log(`❌ Player not alive: ${player.status}`);
        throw new Error('Player not active in game');
      }

      if (player.answer) {
        console.log(`❌ Player already answered: ${player.answer}`);
        throw new Error('Player already answered this question');
      }

      // Record the answer
      player.answer = answer;
      player.answerTime = Date.now();
      console.log(`✅ Set player ${player.user.nickname} answer to: "${player.answer}"`);
      
      // Don't clear the timer - let it expire naturally to process results
      console.log(`⏰ Player ${player.user.nickname} answered, timer will continue until expiration`);

      const currentQuestion = gameState.questions[gameState.currentQuestion];
      const isCorrect = answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
      
      console.log(`🔍 Answer comparison:`);
      console.log(`🔍 Player answer: "${answer}"`);
      console.log(`🔍 Correct answer: "${currentQuestion.correct_answer}"`);
      console.log(`🔍 Is correct: ${isCorrect}`);

      // Save to database
      await PlayerAnswer.create({
        game_id: gameId,
        user_id: player.user.id,
        question_id: currentQuestion.id,
        selected_answer: answer,
        is_correct: isCorrect,
        response_time_ms: Date.now() - gameState.startTime.getTime(),
        question_number: gameState.currentQuestion + 1
      });

      console.log(`📝 Player ${player.user.nickname} answered: ${answer} (${isCorrect ? 'CORRECT' : 'WRONG'})`);

      // Send confirmation message
      await queueService.addMessage('send_message', {
        to: phoneNumber,
        message: `✅ Answer locked in! Please wait until the next round.`
      });

      // Check if all alive players have answered
      const alivePlayers = gameState.players.filter(p => p.status === 'alive');
      const answeredPlayers = alivePlayers.filter(p => p.answer);
      
      console.log(`🔍 Answer check: ${answeredPlayers.length}/${alivePlayers.length} players answered`);
      
      // Only process results immediately if player answered incorrectly
      // For correct answers, wait for the timer to expire
      if (!isCorrect) {
        console.log(`🎯 Player answered incorrectly, processing results immediately`);
        // Player answered incorrectly, process results immediately
        setTimeout(() => {
          this.sendQuestionResults(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
        }, 2000); // 2 second delay to show the "locked in" message
      } else {
        console.log(`✅ Player answered correctly, waiting for timer to expire`);
        // Player answered correctly, wait for the timer to expire naturally
      }

      return {
        correct: answer === gameState.questions[gameState.currentQuestion].correct_answer,
        correctAnswer: gameState.questions[gameState.currentQuestion].correct_answer
      };

    } catch (error) {
      console.error('❌ Error handling player answer:', error);
      throw error;
    }
  }

  // Send question to all alive players
  async sendQuestionToPlayers(gameId, question) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const options = [question.option_a, question.option_b, question.option_c, question.option_d];
      const questionNumber = gameState.currentQuestion + 1;

      for (const [phoneNumber, player] of gameState.players) {
        if (player.isAlive) {
          await queueService.addMessage('send_question', {
            to: phoneNumber,
            questionText: question.question_text,
            options,
            questionNumber,
            correctAnswer: question.correct_answer
          });
        } else {
          // Send spectator update to eliminated players
          await queueService.addMessage('send_message', {
            to: phoneNumber,
            message: `👀 Q${questionNumber}: ${question.question_text}\n\nYou're watching as a spectator.`
          });
        }
      }

    } catch (error) {
      console.error('❌ Error sending question to players:', error);
    }
  }

  // Send timer update
  async sendTimerUpdate(gameId, questionIndex, timeLeft) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const { questions, players } = gameState;
      const question = questions[questionIndex];
      const questionNumber = questionIndex + 1;

      // Send timer update to all alive players who haven't answered
      for (const player of players) {
        if (player.status === 'alive' && !player.answer) {
          // Only send timer update as text message, not interactive
          const timerBar = this.generateTimerBar(timeLeft);
          const message = `⏰ Time left: ${timerBar} ${timeLeft}s`;
          
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: message
          });
        }
      }

    } catch (error) {
      console.error('❌ Error sending timer update:', error);
    }
  }

  // Handle question timeout - eliminate players who didn't answer
  async handleQuestionTimeout(gameId, questionIndex) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const { players, questions } = gameState;
      const question = questions[questionIndex];
      
      console.log(`⏰ Question ${questionIndex + 1} timeout - processing eliminations`);

      // Eliminate players who didn't answer
      for (const player of players) {
        console.log(`🔍 Checking player ${player.user.nickname}: status=${player.status}, answer="${player.answer}"`);
        if (player.status === 'alive' && !player.answer) {
          // Eliminate player for not answering
          player.status = 'eliminated';
          player.eliminatedAt = new Date();
          player.eliminatedOnQuestion = questionIndex + 1;
          player.eliminationReason = 'timeout';

          // Update database
          await GamePlayer.update(
            { 
              status: 'eliminated',
              eliminated_at: new Date(),
              eliminated_on_question: questionIndex + 1,
              elimination_reason: 'timeout'
            },
            { 
              where: { 
                game_id: gameId,
                user_id: player.user.id 
              } 
            }
          );

          console.log(`⏰ Player ${player.user.nickname} eliminated for timeout on Q${questionIndex + 1}`);

          // Send timeout elimination message
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: `⏰ Time's up! You didn't answer in time and have been eliminated.

❌ Eliminated on: Question ${questionIndex + 1}
🎮 Game: ${gameId.slice(0, 8)}...

Stick around to watch the finish! Reply "PLAY" for the next game.`
          });
        }
      }

      // Check if game should end
      const alivePlayers = players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1} (timeout)`);
        await this.endGame(gameId);
        return;
      }

      // Process question results and continue
      await this.sendQuestionResults(gameId, questionIndex, question.correct_answer);

    } catch (error) {
      console.error('❌ Error handling question timeout:', error);
    }
  }

  // Handle player elimination due to 24-hour window expiration
  async handlePlayerElimination(gameId, phoneNumber, reason = '24h_window_expired') {
    try {
      console.log(`⏰ Handling player elimination for ${phoneNumber} in game ${gameId}, reason: ${reason}`);
      
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        console.log(`❌ Game ${gameId} not found in active games`);
        return;
      }

      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (!player || player.status !== 'alive') {
        console.log(`❌ Player ${phoneNumber} not found or not alive in game ${gameId}`);
        return;
      }

      // Mark player as eliminated
      player.status = 'eliminated';
      player.eliminatedAt = new Date();
      player.eliminatedOnQuestion = gameState.currentQuestion + 1;
      player.eliminationReason = reason;
      
      // Update database
      await GamePlayer.update(
        { 
          status: 'eliminated',
          eliminated_at: new Date(),
          eliminated_on_question: gameState.currentQuestion + 1
        },
        { 
          where: { 
            game_id: gameId,
            user_id: player.user.id 
          } 
        }
      );

      console.log(`❌ Player ${player.user.nickname} eliminated due to ${reason} on Q${gameState.currentQuestion + 1}`);

      // Check if game should end (all players eliminated)
      const alivePlayers = gameState.players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated, ending game ${gameId}`);
        await this.endGame(gameId);
        return;
      }

      // If this was during a question, check if all remaining players have answered
      if (gameState.currentQuestion < gameState.questions.length) {
        const currentQuestion = gameState.questions[gameState.currentQuestion];
        const answeredPlayers = alivePlayers.filter(p => p.answer);
        
        if (answeredPlayers.length === alivePlayers.length) {
          console.log(`🎯 All remaining players answered, processing results immediately`);
          setTimeout(() => {
            this.sendQuestionResults(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
          }, 2000);
        }
      }

    } catch (error) {
      console.error('❌ Error handling player elimination:', error);
    }
  }

  // Send question results and handle eliminations
  async sendQuestionResults(gameId, questionIndex, correctAnswer) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const { players, questions } = gameState;
      const question = questions[questionIndex];
      
      console.log(`📊 Processing results for Q${questionIndex + 1}: ${correctAnswer}`);

      // Process each player's answer
      for (const player of players) {
        if (player.status !== 'alive') continue;

        const isCorrect = player.answer && player.answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        
        if (!isCorrect) {
          // Eliminate player
          player.status = 'eliminated';
          player.eliminatedAt = new Date();
          player.eliminatedOnQuestion = questionIndex + 1;
          
          // Update database
          await GamePlayer.update(
            { 
              status: 'eliminated',
              eliminated_at: new Date(),
              eliminated_on_question: questionIndex + 1
            },
            { 
              where: { 
                game_id: gameId,
                user_id: player.user.id 
              } 
            }
          );

          console.log(`❌ Player ${player.user.nickname} eliminated on Q${questionIndex + 1}`);
        }

        // Send result message
        await queueService.addMessage('send_elimination', {
          to: player.user.whatsapp_number,
          correctAnswer,
          isCorrect,
          questionNumber: questionIndex + 1,
          totalQuestions: questions.length
        });
      }

      // Check if game should end (all players eliminated or last question)
      const alivePlayers = players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1}`);
        await this.endGame(gameId);
        return;
      }

      if (questionIndex + 1 >= questions.length) {
        console.log(`🏁 Last question completed. ${alivePlayers.length} survivors!`);
        await this.endGame(gameId);
        return;
      }

      // Continue to next question
      console.log(`⏭️  Continuing to next question. ${alivePlayers.length} players alive`);
      setTimeout(() => {
        this.startQuestion(gameId, questionIndex + 1);
      }, 3000); // 3 second delay before next question

    } catch (error) {
      console.error('❌ Error sending question results:', error);
    }
  }

  // End game
  async endGame(gameId) {
    try {
      console.log(`🏁 Ending game: ${gameId}`);
      
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        console.error(`❌ Game state not found for: ${gameId}`);
        return;
      }

      // Clean up game state
      console.log(`🧹 Cleaning up game state for: ${gameId}`);
      this.activeGames.delete(gameId);
      console.log(`🧹 Game state cleaned up for: ${gameId}`);

      // Process rewards using reward service
      const gameResults = await rewardService.processGameRewards(gameId);
      
      console.log(`🏆 Game ${gameId} ended successfully:`, {
        winnerCount: gameResults.winnerCount,
        status: gameResults.gameStatus,
        prizeDistribution: gameResults.prizeDistribution
      });

      return gameResults;

    } catch (error) {
      console.error('❌ Error ending game:', error);
      throw error;
    }
  }

  // Send game start message
  async sendGameStartMessage(gameId) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      for (const player of gameState.players) {
        await queueService.addMessage('send_message', {
          to: player.user.whatsapp_number,
          message: `🎮 QRush Trivia is starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 5 seconds...`
        });
      }

    } catch (error) {
      console.error('❌ Error sending game start message:', error);
    }
  }

  // Get active game for a player
  async getActiveGameForPlayer(phoneNumber) {
    console.log(`🔍 Looking for active game for player: ${phoneNumber}`);
    console.log(`🔍 Active games count: ${this.activeGames.size}`);
    
    for (const [gameId, gameState] of this.activeGames) {
      console.log(`🔍 Checking game ${gameId}:`);
      console.log(`🔍 - Players count: ${gameState.players.length}`);
      console.log(`🔍 - Current question: ${gameState.currentQuestion}`);
      console.log(`🔍 - Game status: ${gameState.status}`);
      
      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (player) {
        console.log(`✅ Found player in game ${gameId}`);
        return { gameId, gameState, player };
      }
    }
    
    console.log(`❌ No active game found for player ${phoneNumber}`);
    return null;
  }

  // Check if player is in active game
  async isPlayerInActiveGame(phoneNumber) {
    const activeGame = await this.getActiveGameForPlayer(phoneNumber);
    return activeGame !== null;
  }

  // Get player status in active game
  async getPlayerGameStatus(phoneNumber) {
    const activeGame = await this.getActiveGameForPlayer(phoneNumber);
    if (!activeGame) return null;
    
    return {
      gameId: activeGame.gameId,
      status: activeGame.player.status,
      currentQuestion: activeGame.gameState.currentQuestion + 1,
      totalQuestions: activeGame.gameState.questions.length
    };
  }

  // Get game statistics
  async getGameStats(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [
          { model: GamePlayer, as: 'players' },
          { model: PlayerAnswer, as: 'answers' }
        ]
      });

      if (!game) return null;

      return {
        totalPlayers: game.players.length,
        winnerCount: game.winner_count,
        prizePool: game.prize_pool,
        startTime: game.start_time,
        endTime: game.end_time,
        duration: game.end_time ? (game.end_time - game.start_time) / 1000 : null
      };

    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      return null;
    }
  }
}

module.exports = new GameService();
