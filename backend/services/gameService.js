const { Game, GamePlayer, Question, PlayerAnswer, User } = require('../models');
const queueService = require('./queueService');

class GameService {
  constructor() {
    this.activeGames = new Map(); // Track active games
  }

  // Start a game
  async startGame(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [
          { model: Question, as: 'questions', order: [['question_order', 'ASC']] },
          { model: GamePlayer, as: 'players', include: [{ model: User, as: 'user' }] }
        ]
      });

      if (!game) {
        throw new Error('Game not found');
      }

      if (game.status !== 'pre_game') {
        throw new Error('Game is not in pre_game status');
      }

      // Update game status
      game.status = 'in_progress';
      game.start_time = new Date();
      await game.save();

      // Initialize game state
      this.activeGames.set(gameId, {
        gameId,
        currentQuestion: 0,
        questions: game.questions,
        players: game.players.filter(p => p.status === 'alive'),
        startTime: new Date(),
        questionTimer: null
      });

      console.log(`🎮 Game ${gameId} started with ${game.questions.length} questions and ${game.players.length} players`);

      // Start the first question
      await this.startNextQuestion(gameId);

      return game;
    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  // Start the next question
  async startNextQuestion(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) {
      console.error(`❌ Game ${gameId} not found in active games`);
      return;
    }

    const { questions, players } = gameState;

    // Check if we've reached the end of questions
    if (gameState.currentQuestion >= questions.length) {
      await this.endGame(gameId);
      return;
    }

    const question = questions[gameState.currentQuestion];
    console.log(`❓ Starting question ${gameState.currentQuestion + 1}: ${question.question_text}`);

    // Set a timer for this question (10 seconds)
    gameState.questionTimer = setTimeout(async () => {
      await this.endQuestion(gameId);
    }, 10000); // 10 seconds

    // Send question to all alive players (for WhatsApp integration)
    for (const player of players) {
      await queueService.addMessage('send_question', {
        to: player.user.whatsapp_number,
        gameId,
        questionNumber: gameState.currentQuestion + 1,
        question: question,
        timeLimit: 10
      });
    }
  }

  // End the current question
  async endQuestion(gameId) {
    const gameState = this.activeGames.get(gameId);
    if (!gameState) return;

    // Clear the timer
    if (gameState.questionTimer) {
      clearTimeout(gameState.questionTimer);
      gameState.questionTimer = null;
    }

    const question = gameState.questions[gameState.currentQuestion];
    const { players } = gameState;

    console.log(`⏰ Question ${gameState.currentQuestion + 1} ended. Correct answer: ${question.correct_answer}`);

    // Eliminate players who didn't answer correctly
    const eliminatedPlayers = [];
    for (const player of players) {
      const answer = await PlayerAnswer.findOne({
        where: {
          game_id: gameId,
          user_id: player.user_id,
          question_id: question.id
        }
      });

      if (!answer || answer.selected_answer !== question.correct_answer) {
        // Eliminate player
        await player.eliminate(gameState.currentQuestion + 1);
        eliminatedPlayers.push(player);
        console.log(`💀 Player ${player.user.nickname} eliminated`);
      } else {
        // Player answered correctly
        await player.incrementCorrectAnswers();
        console.log(`✅ Player ${player.user.nickname} answered correctly`);
      }
    }

    // Remove eliminated players from active list
    gameState.players = gameState.players.filter(p => !eliminatedPlayers.includes(p));

    // Move to next question
    gameState.currentQuestion++;

    // Check if game should end
    if (gameState.players.length === 0) {
      console.log(`🏁 All players eliminated. Game ${gameId} ending.`);
      await this.endGame(gameId);
    } else if (gameState.currentQuestion >= gameState.questions.length) {
      console.log(`🏁 All questions completed. Game ${gameId} ending.`);
      await this.endGame(gameId);
    } else {
      // Start next question after a short delay
      setTimeout(() => {
        this.startNextQuestion(gameId);
      }, 3000); // 3 second delay between questions
    }
  }

  // End the game and determine winners
  async endGame(gameId) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) return;

      // Clear any active timer
      if (gameState.questionTimer) {
        clearTimeout(gameState.questionTimer);
      }

      const game = await Game.findByPk(gameId);
      if (!game) return;

      // Get all players who are still alive (winners)
      const winners = await GamePlayer.findAll({
        where: {
          game_id: gameId,
          status: 'alive'
        },
        include: [{ model: User, as: 'user' }]
      });

      // Mark all alive players as winners
      for (const winner of winners) {
        await winner.markAsWinner();
      }

      // Update game status
      game.status = 'finished';
      game.end_time = new Date();
      game.winner_count = winners.length;
      game.total_players = await GamePlayer.count({ where: { game_id: gameId } });
      await game.save();

      // Remove from active games
      this.activeGames.delete(gameId);

      console.log(`🏆 Game ${gameId} finished with ${winners.length} winners:`);
      winners.forEach(winner => {
        console.log(`  🎉 ${winner.user.nickname}`);
      });

      // Send winner notifications (for WhatsApp integration)
      for (const winner of winners) {
        await queueService.addMessage('send_winner_notification', {
          to: winner.user.whatsapp_number,
          gameId,
          prizeAmount: game.prize_pool / winners.length,
          totalWinners: winners.length
        });
      }

      return {
        gameId,
        winners: winners.map(w => w.user.nickname),
        winnerCount: winners.length,
        totalPlayers: game.total_players
      };

    } catch (error) {
      console.error(`❌ Error ending game ${gameId}:`, error);
      throw error;
    }
  }

  // Handle player answer
  async handlePlayerAnswer(gameId, playerId, answer) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (!gameState) {
        throw new Error('Game not active');
      }

      const currentQuestion = gameState.questions[gameState.currentQuestion];
      if (!currentQuestion) {
        throw new Error('No active question');
      }

      // Find the player
      const player = gameState.players.find(p => p.user_id === playerId);
      if (!player) {
        throw new Error('Player not found or eliminated');
      }

      // Record the answer
      await PlayerAnswer.create({
        game_id: gameId,
        user_id: playerId,
        question_id: currentQuestion.id,
        selected_answer: answer,
        is_correct: answer === currentQuestion.correct_answer,
        response_time_ms: Date.now() - gameState.startTime.getTime(),
        question_number: gameState.currentQuestion + 1
      });

      console.log(`📝 Player ${player.user.nickname} answered: ${answer}`);

      return {
        correct: answer === currentQuestion.correct_answer,
        correctAnswer: currentQuestion.correct_answer
      };

    } catch (error) {
      console.error('❌ Error handling player answer:', error);
      throw error;
    }
  }

  // Get active game for a player
  async getActiveGameForPlayer(whatsappNumber) {
    try {
      const user = await User.findOne({ where: { whatsapp_number } });
      if (!user) return null;

      const gamePlayer = await GamePlayer.findOne({
        where: {
          user_id: user.id,
          status: 'alive'
        },
        include: [{
          model: Game,
          where: { status: 'in_progress' }
        }]
      });

      return gamePlayer ? { gameId: gamePlayer.game_id, user } : null;
    } catch (error) {
      console.error('❌ Error getting active game for player:', error);
      return null;
    }
  }

  // Get game statistics
  async getGameStats(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [
          { model: Question, as: 'questions' },
          { model: GamePlayer, as: 'players', include: [{ model: User, as: 'user' }] }
        ]
      });

      if (!game) return null;

      const stats = await GamePlayer.getGameStats(gameId);
      const playerStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      return {
        gameId,
        status: game.status,
        startTime: game.start_time,
        endTime: game.end_time,
        totalQuestions: game.questions.length,
        totalPlayers: game.total_players,
        winnerCount: game.winner_count,
        playerStats,
        duration: game.end_time ? (game.end_time - game.start_time) / 1000 : null
      };
    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      return null;
    }
  }

  // Force end a game (admin function)
  async forceEndGame(gameId) {
    try {
      console.log(`🛑 Force ending game ${gameId}`);
      return await this.endGame(gameId);
    } catch (error) {
      console.error(`❌ Error force ending game ${gameId}:`, error);
      throw error;
    }
  }
}

module.exports = new GameService();
