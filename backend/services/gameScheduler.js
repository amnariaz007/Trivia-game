/**
 * Game Scheduler - Checks Game.startTime every 2 seconds
 * Triggers automatic game start when startTime is reached
 */

const cron = require('node-cron');
const { Game } = require('../models');
const { Op } = require('sequelize');
const gameEvents = require('./gameEvents');

class GameScheduler {
  constructor() {
    this.isRunning = false;
    this.scheduler = null;
    console.log('✅ Game Scheduler initialized');
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Game scheduler is already running');
      return;
    }

    console.log('🔄 Starting game scheduler...');
    
    // Check every 2 seconds for games to start
    this.scheduler = cron.schedule('*/2 * * * * *', async () => {
      await this.checkForGamesToStart();
    }, {
      scheduled: false
    });

    this.scheduler.start();
    this.isRunning = true;
    console.log('✅ Game scheduler started - checking every 2 seconds');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }
    this.isRunning = false;
    console.log('⏹️  Game scheduler stopped');
  }

  /**
   * Check for games that should start
   */
  async checkForGamesToStart() {
    try {
      const now = new Date();
      
      // Find games that are scheduled and should start now
      const gamesToStart = await Game.findAll({
        where: {
          status: 'scheduled',
          start_time: {
            [Op.lte]: now
          }
        },
        include: [
          { model: require('../models').GamePlayer, as: 'players' }
        ]
      });

      if (gamesToStart.length > 0) {
        console.log(`🎮 Found ${gamesToStart.length} game(s) ready to start`);
        
        for (const game of gamesToStart) {
          console.log(`🚀 Starting game ${game.id} (scheduled for ${game.start_time})`);
          
          // Update game status to pre_game
          await game.update({ status: 'pre_game' });
          
          // Trigger game start event
          await gameEvents.triggerGameStart(game.id);
        }
      }
    } catch (error) {
      console.error('❌ Error in game scheduler:', error);
    }
  }

  /**
   * Manually trigger a game start (for testing)
   */
  async triggerGameStart(gameId) {
    console.log(`🎮 Manually triggering game start for ${gameId}`);
    await gameEvents.triggerGameStart(gameId);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextCheck: this.scheduler ? 'Every 2 seconds' : 'Not scheduled'
    };
  }
}

// Export singleton instance
const gameScheduler = new GameScheduler();
module.exports = gameScheduler;
