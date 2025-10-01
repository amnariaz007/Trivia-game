/**
 * Event-Driven Game Flow Manager
 * Replaces blocking calls with event-driven architecture
 */

const EventEmitter = require('events');
const { Game, GamePlayer } = require('../models');
const gameService = require('./gameService');

class GameEventManager extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
    console.log('✅ Game Event Manager initialized');
  }

  /**
   * Setup event handlers for game flow
   */
  setupEventHandlers() {
    // Game start event
    this.on('gameStart', async (gameId) => {
      // Clear terminal for easier debugging
      process.stdout.write('\x1B[2J\x1B[0f');
      console.log('🧹 Terminal cleared for new game debugging');
      console.log('='.repeat(80));
      console.log('🎮 NEW GAME STARTING - CLEAN LOGS');
      console.log('='.repeat(80));
      
      console.log(`🎮 Game start event triggered for game ${gameId}`);
      try {
        const game = await Game.findByPk(gameId, {
          include: [
            { model: GamePlayer, as: 'players', include: [{ model: require('../models').User, as: 'user' }] }
          ]
        });

        if (!game) {
          console.log(`❌ Game ${gameId} not found`);
          return;
        }

        if (game.players.length === 0) {
          console.log(`❌ Game ${gameId} has no players`);
          return;
        }

        // Start the game using existing gameService
        await gameService.startGame(gameId);
        
        // Emit next question event after 2 seconds
        setTimeout(() => {
          this.emit('nextQuestion', { 
            gameId, 
            questionIndex: 0, 
            players: game.players 
          });
        }, 2000);

      } catch (error) {
        console.error('❌ Error in gameStart event:', error);
      }
    });

    // Next question event
    this.on('nextQuestion', async ({ gameId, questionIndex, players }) => {
      console.log(`❓ Next question event: Q${questionIndex + 1} for game ${gameId}`);
      try {
        await gameService.startQuestion(gameId, questionIndex);
      } catch (error) {
        console.error('❌ Error in nextQuestion event:', error);
      }
    });

    // Question timeout event
    this.on('questionTimeout', async ({ gameId, questionIndex }) => {
      console.log(`⏰ Question timeout event: Q${questionIndex + 1} for game ${gameId}`);
      try {
        await gameService.handleQuestionTimeout(gameId, questionIndex);
      } catch (error) {
        console.error('❌ Error in questionTimeout event:', error);
      }
    });

    // Game end event
    this.on('gameEnd', async ({ gameId, winners }) => {
      console.log(`🏁 Game end event for game ${gameId} with ${winners.length} winners`);
      try {
        await gameService.endGame(gameId, winners);
      } catch (error) {
        console.error('❌ Error in gameEnd event:', error);
      }
    });
  }

  /**
   * Trigger game start for a specific game
   */
  async triggerGameStart(gameId) {
    this.emit('gameStart', gameId);
  }

  /**
   * Trigger next question
   */
  async triggerNextQuestion(gameId, questionIndex, players) {
    this.emit('nextQuestion', { gameId, questionIndex, players });
  }

  /**
   * Trigger question timeout
   */
  async triggerQuestionTimeout(gameId, questionIndex) {
    this.emit('questionTimeout', { gameId, questionIndex });
  }

  /**
   * Trigger game end
   */
  async triggerGameEnd(gameId, winners) {
    this.emit('gameEnd', { gameId, winners });
  }
}

// Export singleton instance
const gameEvents = new GameEventManager();
module.exports = gameEvents;
