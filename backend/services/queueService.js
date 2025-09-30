const Queue = require('bull');
const Redis = require('ioredis');
const MessageBatcher = require('./messageBatcher');

console.log('🔧 Initializing Queue Service...');

class QueueService {
  constructor() {
    this.redisConnected = false;
    this.redis = null;
    this.messageQueue = null;
    this.gameQueue = null;
    this.messageBatcher = new MessageBatcher();

    // Initialize Redis connection
    this.initializeRedis();
  }

  initializeRedis() {
    if (!process.env.REDIS_URL) {
      console.log("RAW REDIS_URL:", JSON.stringify(process.env.REDIS_URL));
      console.log('⚠️  REDIS_URL not found, running without Redis queues');
      return;
    }

    try {
      console.log('🔄 Creating Redis connection...');
      console.log('🔍 Redis URL:', process.env.REDIS_URL);

      // Auto-detect TLS based on rediss:// scheme
      const needsTLS = process.env.REDIS_URL.startsWith("rediss://");
      console.log('🔍 TLS required:', needsTLS);

      this.redis = new Redis(process.env.REDIS_URL, {
        tls: needsTLS ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
        family: 4, // IPv4
        keepAlive: 30000,
      });

      this.redis.on("connect", () => {
        console.log("✅ Connected to Redis");
        this.redisConnected = true;
        this.initializeQueues();
      });

      this.redis.on("error", (err) => {
        if (!this.redisConnected) {
          console.log("❌ Redis connection error details:");
          console.log("   Error message:", err.message);
          console.log("   Error code:", err.code);
          console.log("   Error errno:", err.errno);
          console.log("   Error syscall:", err.syscall);
          console.log("   Error address:", err.address);
          console.log("   Error port:", err.port);
          console.log("⚠️  Continuing without Redis - app will work with reduced functionality");
          this.redisConnected = false;
          this.redis = null;
        }
      });

      this.redis.on("close", () => {
        this.redisConnected = false;
      });

      // Fallback timeout
      setTimeout(() => {
        if (!this.redisConnected) {
          console.log("⚠️  Redis connection timeout - continuing without Redis");
          this.redis = null;
        }
      }, 10000);

    } catch (error) {
      console.log("❌ Redis initialization error details:");
      console.log("   Error message:", error.message);
      console.log("   Error code:", error.code);
      console.log("   Error errno:", error.errno);
      console.log("   Error syscall:", error.syscall);
      console.log("   Error address:", error.address);
      console.log("   Error port:", error.port);
      console.log("⚠️  Continuing without Redis - app will work with reduced functionality");
      this.redis = null;
    }
  }

  async testRedisConnection() {
    if (!this.redis) {
      console.log('⚠️  Redis not available for testing');
      return;
    }

    try {
      console.log('🧪 Testing basic Redis operations...');
      await this.redis.set('test_key', 'test_value');
      const value = await this.redis.get('test_key');
      console.log('✅ Redis set/get test successful:', value);
      await this.redis.del('test_key');
      console.log('✅ Redis test completed successfully');
    } catch (error) {
      console.error('❌ Redis test failed:', error.message);
    }
  }

  initializeQueues() {
    if (!this.redis) {
      console.log('⚠️  Redis not available, skipping queue initialization');
      return;
    }
  
    try {
      console.log('🔄 Initializing Bull queues...');
      console.log('🔍 Redis URL for queues:', process.env.REDIS_URL);
  
      // Just pass the URL (Bull handles redis:// vs rediss:// automatically)
      this.messageQueue = new Queue('whatsapp-messages', process.env.REDIS_URL);
      this.gameQueue = new Queue('game-timers', process.env.REDIS_URL);
  
      // Add error handlers for queues
      this.messageQueue.on('error', (error) => {
        console.error('❌ Message queue error:', error);
      });
      
      this.gameQueue.on('error', (error) => {
        console.error('❌ Game queue error:', error);
      });
  
      this.setupQueueHandlers();
      this.setupQueueEvents();
  
      console.log('✅ Queues initialized successfully');
      console.log('📊 Message queue ready:', !!this.messageQueue);
      console.log('📊 Game queue ready:', !!this.gameQueue);
    } catch (error) {
      console.error('❌ Failed to initialize queues:', error.message);
      console.error('❌ Queue initialization error details:', error);
      this.messageQueue = null;
      this.gameQueue = null;
    }
  }
  

  setupQueueHandlers() {
    if (!this.messageQueue || !this.gameQueue) {
      console.log('⚠️  Queues not available, skipping queue handlers setup');
      return;
    }

    console.log('🔧 Setting up queue handlers...');
    const MESSAGE_CONCURRENCY = parseInt(process.env.MESSAGE_QUEUE_CONCURRENCY || '25', 10);
    const GAME_CONCURRENCY = parseInt(process.env.GAME_QUEUE_CONCURRENCY || '5', 10);
    console.log(`⚡ Message queue concurrency: ${MESSAGE_CONCURRENCY}`);
    console.log(`⚡ Game queue concurrency: ${GAME_CONCURRENCY}`);

    this.messageQueue.process('send_message', MESSAGE_CONCURRENCY, async (job) => {
      try {
        console.log('📤 Processing send_message job:', job.id);
        return await this.processMessage(job.data);
      } catch (error) {
        console.error('❌ Message queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_template', MESSAGE_CONCURRENCY, async (job) => {
      try {
        console.log('📤 Processing send_template job:', job.id);
        return await this.processTemplate(job.data);
      } catch (error) {
        console.error('❌ Template queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_question', MESSAGE_CONCURRENCY, async (job) => {
      try {
        console.log('📤 Processing send_question job:', job.id);
        return await this.processQuestion(job.data);
      } catch (error) {
        console.error('❌ Question queue processing error:', error);
        throw error;
      }
    });

    this.messageQueue.process('send_elimination', MESSAGE_CONCURRENCY, async (job) => {
      try {
        console.log('📤 Processing send_elimination job:', job.id);
        return await this.processElimination(job.data);
      } catch (error) {
        console.error('❌ Elimination queue processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('game_timer', GAME_CONCURRENCY, async (job) => {
      try {
        console.log('⏰ Processing game_timer job:', job.id);
        return await this.processGameTimer(job.data);
      } catch (error) {
        console.error('❌ Game timer processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('question_timer', GAME_CONCURRENCY, async (job) => {
      try {
        console.log('❓ Processing question_timer job:', job.id);
        return await this.processQuestionTimer(job.data);
      } catch (error) {
        console.error('❌ Question timer processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('question_countdown', GAME_CONCURRENCY, async (job) => {
      try {
        console.log('⏳ Processing question_countdown job:', job.id, 'data:', JSON.stringify(job.data));
        console.log('⏳ Job scheduled at:', new Date(job.timestamp).toISOString());
        console.log('⏳ Job delay was:', job.delay, 'ms');
        const result = await this.processCountdown(job.data);
        console.log('⏳ Countdown job completed successfully:', job.id);
        return result;
      } catch (error) {
        console.error('❌ Question countdown processing error:', error);
        throw error;
      }
    });
  }

  setupQueueEvents() {
    if (!this.messageQueue || !this.gameQueue) return;

    this.messageQueue.on('completed', (job) => {
      console.log(`✅ Message job ${job.id} completed`);
    });

    this.messageQueue.on('failed', (job, err) => {
      console.error(`❌ Message job ${job.id} failed:`, err.message);
    });

    this.gameQueue.on('completed', (job) => {
      console.log(`✅ Game timer job ${job.id} completed`);
    });

    this.gameQueue.on('failed', (job, err) => {
      console.error(`❌ Game timer job ${job.id} failed:`, err.message);
    });
  }

  async testConnection() {
    if (!this.redis) {
      console.log('⚠️  Redis not initialized');
      return false;
    }
    try {
      const pong = await this.redis.ping();
      console.log('✅ Redis ping successful:', pong);
      return true;
    } catch (error) {
      console.error('❌ Redis ping failed:', error.message);
      return false;
    }
  }

  async addMessage(type, data, options = {}) {
    console.log(`📤 Adding message to queue: ${type}`, { to: data.to, messageLength: data.message?.length, gameId: data.gameId });

    // Handle plain text messages even without Redis/queues
    if (type === 'send_message') {
      // For high priority messages (like JOIN responses), send immediately
      if (data.priority === 'high' || data.messageType === 'join_response') {
        console.log('⚡ Sending high priority message immediately');
        try {
          const whatsappService = require('./whatsappService');
          const result = await whatsappService.sendTextMessage(data.to, data.message);
          return { success: true, result };
        } catch (error) {
          console.error('❌ Failed to send immediate message:', error.message);
          return null;
        }
      }
      
      // For normal messages, use batching
      try {
        console.log('📦 Using message batcher for send_message');
        return await this.addBatchedMessage(data.to, data.message, data.priority || 'normal');
      } catch (error) {
        console.error('❌ Failed to add batched message:', error.message);
        console.error('❌ Batcher error details:', error);
        return null;
      }
    }

    // If queues are unavailable, attempt direct sends for certain types
    if (!this.messageQueue) {
      console.log('⚠️  Message queue not available, attempting direct send for type:', type);
      try {
        const whatsappService = require('./whatsappService');
        if (type === 'send_question') {
          return await whatsappService.sendQuestion(
            data.to,
            data.questionText,
            data.options,
            data.questionNumber,
            data.correctAnswer
          );
        }
        if (type === 'send_elimination') {
          return await whatsappService.sendEliminationMessage(
            data.to,
            data.correctAnswer,
            data.isCorrect
          );
        }
      } catch (e) {
        console.error('❌ Direct send fallback failed:', e?.message || e);
        return null;
      }
      // Unknown type without queue
      return null;
    }

    try {
      const job = await this.messageQueue.add(type, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
      });
      console.log(`📤 Added message job ${job.id} to queue`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add message to queue:', error.message);
      return null;
    }
  }

  /**
   * Add a message using the message batcher for high-volume scenarios
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @param {string} priority - Message priority (high, normal, low)
   * @returns {Promise} - Resolves when message is processed
   */
  async addBatchedMessage(to, message, priority = 'normal') {
    try {
      return await this.messageBatcher.addMessage(to, message, priority);
    } catch (error) {
      console.error('❌ Failed to add batched message:', error.message);
      throw error;
    }
  }

  /**
   * Get message batcher statistics
   * @returns {Object} - Batcher statistics
   */
  getBatcherStats() {
    return this.messageBatcher.getStats();
  }

  /**
   * Flush all pending batched messages
   */
  async flushBatchedMessages() {
    await this.messageBatcher.flush();
  }

  async addGameTimer(type, data, delay = 0) {
    if (!this.gameQueue) {
      console.log('⚠️  Game queue not available, skipping timer');
      return null;
    }
    try {
      const job = await this.gameQueue.add(type, data, {
        delay: delay * 1000,
        attempts: 1,
        removeOnComplete: 50,
        removeOnFail: 25
      });
      console.log(`⏰ Added game timer job ${job.id} with ${delay}s delay, type: ${type}, data:`, JSON.stringify(data));
      
      // For countdown jobs, also log the expected execution time
      if (type === 'question_countdown') {
        const executionTime = new Date(Date.now() + (delay * 1000));
        console.log(`⏳ Countdown job will execute at: ${executionTime.toISOString()}`);
      }
      
      return job;
    } catch (error) {
      console.error('❌ Failed to add game timer to queue:', error.message);
      return null;
    }
  }

  async processMessage(data) {
    const { to, message, gameId, messageType } = data;
    
    // Create deduplication key for game messages
    if (gameId && messageType) {
      const dedupeKey = `message_sent:${gameId}:${messageType}:${to}`;
      
      if (this.redis) {
        try {
          const alreadySent = await this.redis.get(dedupeKey);
          if (alreadySent) {
            console.log(`🔄 Skipping duplicate ${messageType} message to ${to} (already sent)`);
            return { message: 'duplicate_skipped' };
          }
          
          // Mark as sent with short expiration for countdowns
          const ttl = (typeof messageType === 'string' && messageType.startsWith('countdown')) ? 10 : 30;
          await this.redis.setex(dedupeKey, ttl, 'sent');
          console.log(`✅ ${messageType} message marked as sent to ${to}`);
        } catch (error) {
          console.error('❌ Redis message deduplication error:', error);
          // Continue with sending if Redis fails
        }
      }
    }
    
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTextMessage(to, message);
  }

  async processTemplate(data) {
    const { to, templateName, parameters } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTemplateMessage(to, templateName, parameters);
  }

  async processQuestion(data) {
    const { to, questionText, options, questionNumber, correctAnswer, gameId } = data;
    
    console.log(`🎯 Processing question ${questionNumber} for ${to} in game ${gameId}`);
    
    // Create deduplication key for this question to this user (but be less aggressive)
    const dedupeKey = `question_sent:${gameId}:${questionNumber}:${to}`;
    
    // Check if this question was already sent to this user (only for same question number)
    if (this.redis) {
      try {
        const alreadySent = await this.redis.get(dedupeKey);
        if (alreadySent) {
          console.log(`🔄 Skipping duplicate question ${questionNumber} to ${to} (already sent)`);
          return { message: 'duplicate_skipped' };
        }
        
        // Mark as sent with 2 minute expiration (shorter for better responsiveness)
        await this.redis.setex(dedupeKey, 120, 'sent');
        console.log(`✅ Question ${questionNumber} marked as sent to ${to}`);
      } catch (error) {
        console.error('❌ Redis deduplication error:', error);
        // Continue with sending if Redis fails
      }
    }
    
    console.log(`📤 Sending question ${questionNumber} to ${to} via WhatsApp service`);
    const whatsappService = require('./whatsappService');
    const result = await whatsappService.sendQuestion(to, questionText, options, questionNumber, correctAnswer);
    console.log(`✅ Question ${questionNumber} sent to ${to}, result:`, result);
    return result;
  }

  async processElimination(data) {
    const { to, correctAnswer, isCorrect } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendEliminationMessage(to, correctAnswer, isCorrect);
  }

  async processGameTimer(data) {
    const { gameId, action } = data;
    const gameService = require('./gameService');
    switch (action) {
      case 'start_game': return await gameService.startGame(gameId);
      case 'end_game': return await gameService.endGame(gameId);
      case 'next_question': return await gameService.nextQuestion(gameId);
      default: console.log('⚠️  Unknown game timer action:', action);
    }
  }

  async processQuestionTimer(data) {
    const { gameId, questionIndex } = data;
    const gameService = require('./gameService');
    return await gameService.handleQuestionTimeout(gameId, questionIndex);
  }

  async processCountdown(data) {
    const { gameId, questionIndex, secondsLeft, scheduledAt, totalSeconds } = data;
    const gameService = require('./gameService');
    
    console.log(`⏳ Processing countdown: gameId=${gameId}, question=${questionIndex + 1}, secondsLeft=${secondsLeft}, scheduledAt=${scheduledAt}, totalSeconds=${totalSeconds}`);
    
    return await gameService.sendCountdown(gameId, questionIndex, secondsLeft, {
      scheduledAt,
      totalSeconds
    });
  }

  async getQueueStats() {
    if (!this.messageQueue || !this.gameQueue) {
      return {
        messageQueue: { available: false },
        gameQueue: { available: false }
      };
    }
    try {
      return {
        messageQueue: {
          available: true,
          waiting: await this.messageQueue.getWaiting(),
          active: await this.messageQueue.getActive(),
          completed: await this.messageQueue.getCompleted(),
          failed: await this.messageQueue.getFailed()
        },
        gameQueue: {
          available: true,
          waiting: await this.gameQueue.getWaiting(),
          active: await this.gameQueue.getActive(),
          completed: await this.gameQueue.getCompleted(),
          failed: await this.gameQueue.getFailed()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error.message);
      return {
        messageQueue: { available: false, error: error.message },
        gameQueue: { available: false, error: error.message }
      };
    }
  }

  // Clear all deduplication keys for a game
  async clearGameDeduplication(gameId) {
    try {
      if (!this.redis) return;
      
      // Get all keys matching the game pattern
      const pattern = `*${gameId}*`;
      const keys = [];
      let cursor = '0';
      
      do {
        const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (Array.isArray(batch) && batch.length > 0) {
          keys.push(...batch);
        }
      } while (cursor !== '0');
      
      // Delete all matching keys
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ Cleared ${keys.length} deduplication keys for game ${gameId}`);
      }
      
    } catch (error) {
      console.error('❌ Error clearing game deduplication:', error);
    }
  }

  // Session management methods
  async getSession(userId) {
    if (!this.redis) {
      console.log('⚠️  Redis not available for session management');
      return null;
    }
    try {
      const sessionData = await this.redis.get(`session:${userId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('❌ Error getting session:', error.message);
      return null;
    }
  }

  async setSession(userId, sessionData) {
    if (!this.redis) {
      console.log('⚠️  Redis not available for session management');
      return false;
    }
    try {
      await this.redis.setex(`session:${userId}`, 3600, JSON.stringify(sessionData)); // 1 hour expiry
      return true;
    } catch (error) {
      console.error('❌ Error setting session:', error.message);
      return false;
    }
  }

  async deleteSession(userId) {
    if (!this.redis) {
      console.log('⚠️  Redis not available for session management');
      return false;
    }
    try {
      await this.redis.del(`session:${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting session:', error.message);
      return false;
    }
  }

  // Redis-based locking mechanism for race condition prevention
  async acquireLock(lockKey, ttlSeconds = 30) {
    if (!this.redis) {
      console.log('⚠️  Redis not available for locking');
      return false;
    }

    try {
      const lockValue = Date.now().toString();
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttlSeconds * 1000, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('❌ Error acquiring lock:', error);
      return false;
    }
  }

  async releaseLock(lockKey) {
    if (!this.redis) return;

    try {
      await this.redis.del(lockKey);
    } catch (error) {
      console.error('❌ Error releasing lock:', error);
    }
  }

  async isLocked(lockKey) {
    if (!this.redis) return false;

    try {
      const result = await this.redis.exists(lockKey);
      return result === 1;
    } catch (error) {
      console.error('❌ Error checking lock:', error);
      return false;
    }
  }

  // Clear deduplication keys for a game (call when game ends)
  async clearGameDeduplication(gameId) {
    if (!this.redis) return;
    
    try {
      console.log(`🧹 Clearing deduplication keys for game ${gameId}`);
      
      // Get all keys matching the game pattern
      const questionKeys = await this.redis.keys(`question_sent:${gameId}:*`);
      const messageKeys = await this.redis.keys(`message_sent:${gameId}:*`);
      
      const allKeys = [...questionKeys, ...messageKeys];
      
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        console.log(`✅ Cleared ${allKeys.length} deduplication keys for game ${gameId}`);
      } else {
        console.log(`ℹ️  No deduplication keys found for game ${gameId}`);
      }
    } catch (error) {
      console.error('❌ Error clearing deduplication keys:', error);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up queues...');
    if (this.messageQueue) await this.messageQueue.close();
    if (this.gameQueue) await this.gameQueue.close();
    if (this.redis) await this.redis.quit();
    console.log('✅ Queue cleanup completed');
  }
}

const queueService = new QueueService();
module.exports = queueService;
