const Queue = require('bull');
console.log("enterbull");
const Redis = require('ioredis');
console.log("enterbull");
console.log(process.env.REDIS_URL);


class QueueService {
  constructor() {
    // Create Redis connection with ioredis (Railway compatible)
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      tls: process.env.NODE_ENV === 'production' ? {} : undefined // enables SSL for Railway
    });

    // Initialize queues with Redis URL
    this.messageQueue = new Queue('whatsapp-messages', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.gameQueue = new Queue('game-timers', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.setupQueueHandlers();
    this.connectRedis();
  }

  async connectRedis() {
    try {
      // ioredis connects automatically, but we can test the connection
      await this.redis.ping();
      console.log('✅ Redis nihsaani');
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  setupQueueHandlers() {
    console.log('🔧 Setting up queue handlers...');
    
    // Message queue processor
    this.messageQueue.process('send_message', 1, async (job) => {
      try {
        console.log('📤 Processing send_message job:', job.id);
        return await this.processMessage(job.data);
      } catch (error) {
        console.error('❌ Message queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_template', 1, async (job) => {
      try {
        console.log('📤 Processing send_template job:', job.id);
        return await this.processTemplate(job.data);
      } catch (error) {
        console.error('❌ Template queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_question', 1, async (job) => {
      try {
        console.log('📤 Processing send_question job:', job.id);
        return await this.processQuestion(job.data);
      } catch (error) {
        console.error('❌ Question queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_elimination', 1, async (job) => {
      try {
        console.log('📤 Processing send_elimination job:', job.id);
        return await this.processElimination(job.data);
      } catch (error) {
        console.error('❌ Elimination queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_winner', 1, async (job) => {
      try {
        console.log('📤 Processing send_winner job:', job.id);
        return await this.processWinner(job.data);
      } catch (error) {
        console.error('❌ Winner queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_timer_update', 1, async (job) => {
      try {
        console.log('📤 Processing send_timer_update job:', job.id);
        return await this.processTimerUpdate(job.data);
      } catch (error) {
        console.error('❌ Timer update queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_game_start', 1, async (job) => {
      try {
        console.log('📤 Processing send_game_start job:', job.id);
        return await this.processGameStart(job.data);
      } catch (error) {
        console.error('❌ Game start queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_game_end', 1, async (job) => {
      try {
        console.log('📤 Processing send_game_end job:', job.id);
        return await this.processGameEnd(job.data);
      } catch (error) {
        console.error('❌ Game end queue processing error:', error);
        throw error;
      }
    });

    // Game timer queue processor
    this.gameQueue.process('question_timer', 1, async (job) => {
      try {
        console.log('⏰ Processing question_timer job:', job.id);
        return await this.processQuestionTimer(job.data);
      } catch (error) {
        console.error('❌ Question timer processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('game_start', 1, async (job) => {
      try {
        console.log('⏰ Processing game_start job:', job.id);
        return await this.processGameStart(job.data);
      } catch (error) {
        console.error('❌ Game start timer processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('game_end', 1, async (job) => {
      try {
        console.log('⏰ Processing game_end job:', job.id);
        return await this.processGameEnd(job.data);
      } catch (error) {
        console.error('❌ Game end timer processing error:', error);
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
    const { to, questionText, options, questionNumber, correctAnswer } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendQuestion(to, questionText, options, questionNumber, correctAnswer);
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

  async processTimerUpdate(data) {
    const { to, questionNumber, timeLeft, questionText, options, correctAnswer } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTimerUpdate(to, questionNumber, timeLeft, questionText, options, correctAnswer);
  }

  async processGameStart(data) {
    const { to, gameInfo } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendGameStartMessage(to, gameInfo);
  }

  async processGameEnd(data) {
    const { to, gameResult } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendGameEndMessage(to, gameResult);
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
