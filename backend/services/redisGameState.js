/**
 * Redis Game State Manager for 1000+ User Load
 * Manages game state in Redis for better scalability and persistence
 */

const Redis = require('ioredis');

class RedisGameState {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.keyPrefix = 'qrush:game:';
    
    // Initialize Redis connection
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          this.connected = true;
          console.log('✅ Redis Game State connected');
        });

        this.redis.on('error', (error) => {
          this.connected = false;
          console.error('❌ Redis Game State error:', error.message);
        });

        this.redis.on('close', () => {
          this.connected = false;
          console.log('⚠️ Redis Game State connection closed');
        });

        // Connect to Redis
        this.redis.connect().catch(error => {
          console.error('❌ Failed to connect to Redis Game State:', error.message);
        });

      } else {
        console.log('⚠️ REDIS_URL not found, Redis Game State disabled');
      }
    } catch (error) {
      console.error('❌ Error initializing Redis Game State:', error);
    }
  }

  /**
   * Check if Redis is available
   * @returns {boolean} Redis availability
   */
  isAvailable() {
    return this.connected && this.redis;
  }

  /**
   * Get game state from Redis
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} Game state or null
   */
  async getGameState(gameId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = `${this.keyPrefix}${gameId}`;
      const data = await this.redis.get(key);
      
      if (data) {
        const gameState = JSON.parse(data);
        
        // Convert string dates back to Date objects
        if (gameState.startTime && typeof gameState.startTime === 'string') {
          gameState.startTime = new Date(gameState.startTime);
        }
        if (gameState.questionStartTime && typeof gameState.questionStartTime === 'string') {
          gameState.questionStartTime = new Date(gameState.questionStartTime);
        }
        
        // Convert player dates
        if (gameState.players) {
          gameState.players.forEach(player => {
            if (player.eliminatedAt && typeof player.eliminatedAt === 'string') {
              player.eliminatedAt = new Date(player.eliminatedAt);
            }
          });
        }
        
        return gameState;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting game state for ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Set game state in Redis
   * @param {string} gameId - Game ID
   * @param {Object} gameState - Game state object
   * @param {number} ttl - Time to live in seconds (default: 3600 = 1 hour)
   * @returns {Promise<boolean>} Success status
   */
  async setGameState(gameId, gameState, ttl = 3600) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const key = `${this.keyPrefix}${gameId}`;
      const data = JSON.stringify({
        ...gameState,
        lastUpdated: new Date().toISOString()
      });

      await this.redis.setex(key, ttl, data);
      return true;
    } catch (error) {
      console.error(`❌ Error setting game state for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Update specific fields in game state
   * @param {string} gameId - Game ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  async updateGameState(gameId, updates) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const currentState = await this.getGameState(gameId);
      if (!currentState) {
        return false;
      }

      const updatedState = {
        ...currentState,
        ...updates,
        lastUpdated: new Date().toISOString()
      };

      return await this.setGameState(gameId, updatedState);
    } catch (error) {
      console.error(`❌ Error updating game state for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Delete game state from Redis
   * @param {string} gameId - Game ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteGameState(gameId) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const key = `${this.keyPrefix}${gameId}`;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting game state for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Get all active game IDs
   * @returns {Promise<Array>} Array of game IDs
   */
  async getActiveGameIds() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      return keys.map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('❌ Error getting active game IDs:', error);
      return [];
    }
  }

  /**
   * Get all active game states
   * @returns {Promise<Array>} Array of game states
   */
  async getAllActiveGames() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const gameIds = await this.getActiveGameIds();
      const games = [];

      for (const gameId of gameIds) {
        const gameState = await this.getGameState(gameId);
        if (gameState) {
          games.push({ gameId, ...gameState });
        }
      }

      return games;
    } catch (error) {
      console.error('❌ Error getting all active games:', error);
      return [];
    }
  }

  /**
   * Update player status in game state
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updatePlayerStatus(gameId, playerId, status) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState || !gameState.players) {
        return false;
      }

      const playerIndex = gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        return false;
      }

      gameState.players[playerIndex].status = status;
      gameState.players[playerIndex].lastUpdated = new Date().toISOString();

      return await this.setGameState(gameId, gameState);
    } catch (error) {
      console.error(`❌ Error updating player status for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Add player to game state
   * @param {string} gameId - Game ID
   * @param {Object} player - Player object
   * @returns {Promise<boolean>} Success status
   */
  async addPlayer(gameId, player) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        return false;
      }

      if (!gameState.players) {
        gameState.players = [];
      }

      // Check if player already exists
      const existingIndex = gameState.players.findIndex(p => p.id === player.id);
      if (existingIndex !== -1) {
        gameState.players[existingIndex] = { ...player, lastUpdated: new Date().toISOString() };
      } else {
        gameState.players.push({ ...player, lastUpdated: new Date().toISOString() });
      }

      return await this.setGameState(gameId, gameState);
    } catch (error) {
      console.error(`❌ Error adding player to ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Remove player from game state
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<boolean>} Success status
   */
  async removePlayer(gameId, playerId) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState || !gameState.players) {
        return false;
      }

      gameState.players = gameState.players.filter(p => p.id !== playerId);
      return await this.setGameState(gameId, gameState);
    } catch (error) {
      console.error(`❌ Error removing player from ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Update game question
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index
   * @param {Object} question - Question object
   * @returns {Promise<boolean>} Success status
   */
  async updateQuestion(gameId, questionIndex, question) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        return false;
      }

      if (!gameState.questions) {
        gameState.questions = [];
      }

      gameState.questions[questionIndex] = {
        ...question,
        lastUpdated: new Date().toISOString()
      };

      return await this.setGameState(gameId, gameState);
    } catch (error) {
      console.error(`❌ Error updating question for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Get game statistics
   * @returns {Promise<Object>} Game statistics
   */
  async getGameStats() {
    if (!this.isAvailable()) {
      return { activeGames: 0, totalPlayers: 0 };
    }

    try {
      const activeGames = await this.getAllActiveGames();
      const totalPlayers = activeGames.reduce((sum, game) => sum + (game.players?.length || 0), 0);

      return {
        activeGames: activeGames.length,
        totalPlayers,
        games: activeGames.map(game => ({
          id: game.gameId,
          status: game.status,
          players: game.players?.length || 0,
          currentQuestion: game.currentQuestion || 0
        }))
      };
    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      return { activeGames: 0, totalPlayers: 0 };
    }
  }

  /**
   * Clean up expired games
   * @returns {Promise<number>} Number of games cleaned up
   */
  async cleanupExpiredGames() {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const activeGames = await this.getAllActiveGames();
      const now = new Date();
      let cleanedCount = 0;

      for (const game of activeGames) {
        const lastUpdated = new Date(game.lastUpdated);
        const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

        // Remove games that haven't been updated in 2 hours
        if (hoursSinceUpdate > 2) {
          await this.deleteGameState(game.gameId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired games from Redis`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired games:', error);
      return 0;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
      console.log('🔌 Redis Game State connection closed');
    }
  }
}

module.exports = RedisGameState;
