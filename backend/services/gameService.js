const { Game, User, Question, GamePlayer, PlayerAnswer } = require('../models');
const queueService = require('./queueService');
const whatsappService = require('./whatsappService');

class GameService {
  constructor() {
    this.activeGames = new Map(); // In-memory game state
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

      // Initialize game state
      const gameState = {
        gameId,
        currentQuestion: 0,
        totalQuestions: game.questions.length,
        players: new Map(),
        eliminatedPlayers: new Set(),
        questionStartTime: null,
        questionTimer: null
      };

      // Initialize player states
      for (const player of game.players) {
        gameState.players.set(player.user.whatsapp_number, {
          userId: player.user.id,
          nickname: player.user.nickname,
          isAlive: true,
          hasAnswered: false,
          answer: null
        });
      }

      this.activeGames.set(gameId, gameState);

      // Send game start message to all players
      await this.sendGameStartMessage(gameId);

      // Start first question after 5 seconds
      setTimeout(() => {
        this.startQuestion(gameId, 0);
      }, 5000);

      console.log(`🎮 Game ${gameId} started with ${gameState.players.size} players`);
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

      const game = await Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });

      if (questionIndex >= game.questions.length) {
        // Game finished
        await this.endGame(gameId);
        return;
      }

      const question = game.questions[questionIndex];
      gameState.currentQuestion = questionIndex;
      gameState.questionStartTime = new Date();
      gameState.questionTimer = 10; // 10 seconds

      // Reset player answer states
      for (const [phoneNumber, player] of gameState.players) {
        if (player.isAlive) {
          player.hasAnswered = false;
          player.answer = null;
        }
      }

      // Update game in database
      game.current_question = questionIndex;
      await game.save();

      // Send question to all alive players
      await this.sendQuestionToPlayers(gameId, question);

      // Start timer
      this.startQuestionTimer(gameId, questionIndex);

      console.log(`❓ Question ${questionIndex + 1} started for game ${gameId}`);

    } catch (error) {
      console.error('❌ Error starting question:', error);
      throw error;
    }
  }

  // Start question timer
  startQuestionTimer(gameId, questionIndex) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) return;

    const timer = setInterval(async () => {
      gameState.questionTimer--;

      // Send timer updates at specific intervals
      if (gameState.questionTimer === 5 || gameState.questionTimer === 2) {
        await this.sendTimerUpdate(gameId, questionIndex, gameState.questionTimer);
      }

      if (gameState.questionTimer <= 0) {
        clearInterval(timer);
        await this.handleQuestionTimeout(gameId, questionIndex);
      }
    }, 1000);
  }

  // Handle question timeout
  async handleQuestionTimeout(gameId, questionIndex) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const game = await Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });

      const question = game.questions[questionIndex];
      const correctAnswer = question.correct_answer;

      // Eliminate players who haven't answered
      for (const [phoneNumber, player] of gameState.players) {
        if (player.isAlive && !player.hasAnswered) {
          player.isAlive = false;
          gameState.eliminatedPlayers.add(phoneNumber);
          
          // Send elimination message
          await queueService.addMessage('send_elimination', {
            to: phoneNumber,
            correctAnswer,
            isCorrect: false
          });
        }
      }

      // Send results to all players
      await this.sendQuestionResults(gameId, questionIndex, correctAnswer);

      // Check if game should continue
      const aliveCount = Array.from(gameState.players.values()).filter(p => p.isAlive).length;
      
      if (aliveCount <= 1) {
        // Game over
        setTimeout(() => {
          this.endGame(gameId);
        }, 3000);
      } else {
        // Continue to next question
        setTimeout(() => {
          this.startQuestion(gameId, questionIndex + 1);
        }, 3000);
      }

    } catch (error) {
      console.error('❌ Error handling question timeout:', error);
    }
  }

  // Handle player answer
  async handlePlayerAnswer(gameId, phoneNumber, answer) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        throw new Error('Game not found');
      }

      const player = gameState.players.get(phoneNumber);
      if (!player || !player.isAlive || player.hasAnswered) {
        // Player already answered or is eliminated
        await queueService.addMessage('send_message', {
          to: phoneNumber,
          message: '🔒 Your first answer was locked in. Please wait until the next round.'
        });
        return;
      }

      // Mark player as answered
      player.hasAnswered = true;
      player.answer = answer;

      // Check if answer is correct
      const game = await Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });

      const question = game.questions[gameState.currentQuestion];
      const isCorrect = answer === question.correct_answer;

      if (!isCorrect) {
        // Eliminate player
        player.isAlive = false;
        gameState.eliminatedPlayers.add(phoneNumber);
      }

      // Send confirmation message
      await queueService.addMessage('send_message', {
        to: phoneNumber,
        message: '✅ Answer locked in! Please wait until the next round.'
      });

      // Check if all players have answered
      const allAnswered = Array.from(gameState.players.values())
        .filter(p => p.isAlive)
        .every(p => p.hasAnswered);

      if (allAnswered) {
        // End question early
        await this.handleQuestionTimeout(gameId, gameState.currentQuestion);
      }

    } catch (error) {
      console.error('❌ Error handling player answer:', error);
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
            questionNumber
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

      const game = await Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });

      const question = game.questions[questionIndex];
      const options = [question.option_a, question.option_b, question.option_c, question.option_d];
      const questionNumber = questionIndex + 1;

      for (const [phoneNumber, player] of gameState.players) {
        if (player.isAlive && !player.hasAnswered) {
          await whatsappService.sendQuestionWithTimer(
            phoneNumber,
            question.question_text,
            options,
            questionNumber,
            timeLeft
          );
        }
      }

    } catch (error) {
      console.error('❌ Error sending timer update:', error);
    }
  }

  // Send question results
  async sendQuestionResults(gameId, questionIndex, correctAnswer) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      for (const [phoneNumber, player] of gameState.players) {
        const isCorrect = player.answer === correctAnswer;
        await queueService.addMessage('send_elimination', {
          to: phoneNumber,
          correctAnswer,
          isCorrect
        });
      }

    } catch (error) {
      console.error('❌ Error sending question results:', error);
    }
  }

  // End game
  async endGame(gameId) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      const game = await Game.findByPk(gameId);
      
      // Find winners
      const winners = Array.from(gameState.players.values()).filter(p => p.isAlive);
      const winnerCount = winners.length;
      const prizePool = parseFloat(game.prize_pool);
      const individualPrize = winnerCount > 0 ? (prizePool / winnerCount).toFixed(2) : 0;

      // Update game in database
      game.status = 'finished';
      game.end_time = new Date();
      game.winner_count = winnerCount;
      await game.save();

      // Send winner announcements
      for (const [phoneNumber, player] of gameState.players) {
        await queueService.addMessage('send_winner', {
          to: phoneNumber,
          winnerCount,
          prizePool,
          individualPrize
        });
      }

      // Clean up game state
      this.activeGames.delete(gameId);

      console.log(`🏆 Game ${gameId} ended with ${winnerCount} winners`);

    } catch (error) {
      console.error('❌ Error ending game:', error);
    }
  }

  // Send game start message
  async sendGameStartMessage(gameId) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      for (const [phoneNumber, player] of gameState.players) {
        await queueService.addMessage('send_message', {
          to: phoneNumber,
          message: `🎮 QRush Trivia is starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 5 seconds...`
        });
      }

    } catch (error) {
      console.error('❌ Error sending game start message:', error);
    }
  }

  // Get active game for a player
  async getActiveGameForPlayer(phoneNumber) {
    for (const [gameId, gameState] of this.activeGames) {
      if (gameState.players.has(phoneNumber)) {
        return { gameId, gameState };
      }
    }
    return null;
  }

  // Check if player is in active game
  async isPlayerInActiveGame(phoneNumber) {
    const activeGame = await this.getActiveGameForPlayer(phoneNumber);
    return activeGame !== null;
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
