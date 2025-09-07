const Queue = require('bull');
const Redis = require('redis');

class QueueService {
  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Initialize queues
    this.messageQueue = new Queue('whatsapp-messages', {
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    });

    this.gameQueue = new Queue('game-timers', {
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    });

    this.setupQueueHandlers();
    this.connectRedis();
  }

  async connectRedis() {
    try {
      await this.redis.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  setupQueueHandlers() {
    // Message queue processor
    this.messageQueue.process(async (job) => {
      try {
        const { type, data } = job.data;
        
        switch (type) {
          case 'send_message':
            return await this.processMessage(data);
          case 'send_template':
            return await this.processTemplate(data);
          case 'send_question':
            return await this.processQuestion(data);
          case 'send_elimination':
            return await this.processElimination(data);
          case 'send_winner':
            return await this.processWinner(data);
          default:
            throw new Error(`Unknown message type: ${type}`);
        }
      } catch (error) {
        console.error('❌ Message queue processing error:', error);
        throw error;
      }
    });

    // Game timer queue processor
    this.gameQueue.process(async (job) => {
      try {
        const { type, data } = job.data;
        
        switch (type) {
          case 'question_timer':
            return await this.processQuestionTimer(data);
          case 'game_start':
            return await this.processGameStart(data);
          case 'game_end':
            return await this.processGameEnd(data);
          default:
            throw new Error(`Unknown timer type: ${type}`);
        }
      } catch (error) {
        console.error('❌ Game timer processing error:', error);
        throw error;
      }
    });

    // Error handlers
    this.messageQueue.on('error', (error) => {
      console.error('❌ Message queue error:', error);
    });

    this.gameQueue.on('error', (error) => {
      console.error('❌ Game queue error:', error);
    });

    this.messageQueue.on('completed', (job) => {
      console.log(`✅ Message job ${job.id} completed`);
    });

    this.gameQueue.on('completed', (job) => {
      console.log(`✅ Game timer job ${job.id} completed`);
    });
  }

  // Add message to queue
  async addMessage(type, data, options = {}) {
    const job = await this.messageQueue.add(type, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50,
      ...options
    });

    console.log(`📤 Added message job ${job.id} to queue`);
    return job;
  }

  // Add game timer to queue
  async addGameTimer(type, data, delay = 0) {
    const job = await this.gameQueue.add(type, data, {
      delay: delay * 1000, // Convert seconds to milliseconds
      attempts: 1,
      removeOnComplete: 50,
      removeOnFail: 25
    });

    console.log(`⏰ Added game timer job ${job.id} with ${delay}s delay`);
    return job;
  }

  // Process different message types
  async processMessage(data) {
    const { to, message } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTextMessage(to, message);
  }

  async processTemplate(data) {
    const { to, templateName, language } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTemplateMessage(to, templateName, language);
  }

  async processQuestion(data) {
    const { to, questionText, options, questionNumber } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendQuestion(to, questionText, options, questionNumber);
  }

  async processElimination(data) {
    const { to, correctAnswer, isCorrect } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendEliminationMessage(to, correctAnswer, isCorrect);
  }

  async processWinner(data) {
    const { to, winnerCount, prizePool, individualPrize } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendWinnerAnnouncement(to, winnerCount, prizePool, individualPrize);
  }

  // Process game timer events
  async processQuestionTimer(data) {
    const { gameId, questionNumber, timeLeft } = data;
    
    if (timeLeft <= 0) {
      // Time's up - eliminate players who haven't answered
      const gameService = require('./gameService');
      await gameService.handleQuestionTimeout(gameId, questionNumber);
    } else {
      // Send timer update to players
      const gameService = require('./gameService');
      await gameService.sendTimerUpdate(gameId, questionNumber, timeLeft);
      
      // Schedule next timer update
      if (timeLeft > 1) {
        await this.addGameTimer('question_timer', {
          gameId,
          questionNumber,
          timeLeft: timeLeft - 1
        }, 1);
      }
    }
  }

  async processGameStart(data) {
    const { gameId } = data;
    const gameService = require('./gameService');
    await gameService.startGame(gameId);
  }

  async processGameEnd(data) {
    const { gameId } = data;
    const gameService = require('./gameService');
    await gameService.endGame(gameId);
  }

  // Session management
  async setSession(userId, data, ttl = 3600) {
    const key = `session:${userId}`;
    await this.redis.setEx(key, ttl, JSON.stringify(data));
  }

  async getSession(userId) {
    const key = `session:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId) {
    const key = `session:${userId}`;
    await this.redis.del(key);
  }

  // Game state management
  async setGameState(gameId, state, ttl = 7200) {
    const key = `game:${gameId}`;
    await this.redis.setEx(key, ttl, JSON.stringify(state));
  }

  async getGameState(gameId) {
    const key = `game:${gameId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteGameState(gameId) {
    const key = `game:${gameId}`;
    await this.redis.del(key);
  }

  // Player state management
  async setPlayerState(gameId, userId, state, ttl = 3600) {
    const key = `player:${gameId}:${userId}`;
    await this.redis.setEx(key, ttl, JSON.stringify(state));
  }

  async getPlayerState(gameId, userId) {
    const key = `player:${gameId}:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deletePlayerState(gameId, userId) {
    const key = `player:${gameId}:${userId}`;
    await this.redis.del(key);
  }

  // Queue management
  async getQueueStats() {
    const messageStats = await this.messageQueue.getJobCounts();
    const gameStats = await this.gameQueue.getJobCounts();
    
    return {
      messageQueue: messageStats,
      gameQueue: gameStats
    };
  }

  async clearQueues() {
    await this.messageQueue.empty();
    await this.gameQueue.empty();
    console.log('🧹 Queues cleared');
  }

  async close() {
    await this.messageQueue.close();
    await this.gameQueue.close();
    await this.redis.quit();
    console.log('🔌 Queue service closed');
  }
}

module.exports = new QueueService();
