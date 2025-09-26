const Queue = require('bull');
const Redis = require('ioredis');

console.log('🔧 Initializing Queue Service...');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
console.log('REDIS_URL value:', process.env.REDIS_URL);

class QueueService {
  constructor() {
    this.redisConnected = false;
    this.redis = null;
    this.messageQueue = null;
    this.gameQueue = null;

    // Initialize Redis connection
    this.initializeRedis();
  }

  initializeRedis() {
    if (!process.env.REDIS_URL) {
      console.log('⚠️  REDIS_URL not found 20');
      return;
    }

    try {
      console.log('🔄 Creating Redis connection...');
      
      // Create Redis connection with ioredis
      this.redis = new Redis(process.env.REDIS_URL, {
        // Railway Redis configuration
        tls: process.env.NODE_ENV === 'production' ? {} : undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000
      });

      // Add explicit event listeners (Railway recommended pattern)
      this.redis.on("connect", () => {
        console.log("✅ Connected to Redis");
        this.redisConnected = true;
      });

      this.redis.on("error", (err) => {
        console.error("❌ Redis error:", err.message);
        this.redisConnected = false;
      });

      this.redis.on("close", () => {
        console.log("⚠️  Redis connection closed");
        this.redisConnected = false;
      });

      // Initialize Bull queues with Redis connection
      this.initializeQueues();
      
      // Test basic Redis connection
      this.testRedisConnection();
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.redis = null;
    }
  }

  // Test basic Redis connection (like your example)
  async testRedisConnection() {
    if (!this.redis) {
      console.log('⚠️  Redis not available for testing');
      return;
    }

    try {
      console.log('🧪 Testing basic Redis operations...');
      
      // Test set/get (like your example)
      await this.redis.set('test_key', 'test_value');
      const value = await this.redis.get('test_key');
      console.log('✅ Redis set/get test successful:', value);
      
      // Clean up
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

      // Create message queue
      this.messageQueue = new Queue('whatsapp-messages', {
        redis: {
          host: this.redis.options.host,
          port: this.redis.options.port,
          password: this.redis.options.password,
          tls: this.redis.options.tls
        }
      });

      // Create game queue
      this.gameQueue = new Queue('game-timers', {
        redis: {
          host: this.redis.options.host,
          port: this.redis.options.port,
          password: this.redis.options.password,
          tls: this.redis.options.tls
        }
      });

      // Setup queue handlers
      this.setupQueueHandlers();
      this.setupQueueEvents();

      console.log('✅ Queues initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize queues:', error.message);
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

    // Game queue processor
    this.gameQueue.process('game_timer', 1, async (job) => {
      try {
        console.log('⏰ Processing game_timer job:', job.id);
        return await this.processGameTimer(job.data);
      } catch (error) {
        console.error('❌ Game timer processing error:', error);
        throw error;
      }
    });

    this.gameQueue.process('question_timer', 1, async (job) => {
      try {
        console.log('❓ Processing question_timer job:', job.id);
        return await this.processQuestionTimer(job.data);
      } catch (error) {
        console.error('❌ Question timer processing error:', error);
        throw error;
      }
    });
  }

  setupQueueEvents() {
    if (!this.messageQueue || !this.gameQueue) {
      return;
    }

    // Message queue events
    this.messageQueue.on('completed', (job) => {
      console.log(`✅ Message job ${job.id} completed`);
    });

    this.messageQueue.on('failed', (job, err) => {
      console.error(`❌ Message job ${job.id} failed:`, err.message);
    });

    // Game queue events
    this.gameQueue.on('completed', (job) => {
      console.log(`✅ Game timer job ${job.id} completed`);
    });

    this.gameQueue.on('failed', (job, err) => {
      console.error(`❌ Game timer job ${job.id} failed:`, err.message);
    });
  }

  // Test Redis connection
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

  // Add message to queue
  async addMessage(type, data, options = {}) {
    if (!this.messageQueue) {
      console.log('⚠️  Message queue not available, skipping message');
      return null;
    }

    try {
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
    } catch (error) {
      console.error('❌ Failed to add message to queue:', error.message);
      return null;
    }
  }

  // Add game timer to queue
  async addGameTimer(type, data, delay = 0) {
    if (!this.gameQueue) {
      console.log('⚠️  Game queue not available, skipping timer');
      return null;
    }

    try {
      const job = await this.gameQueue.add(type, data, {
        delay: delay * 1000, // Convert seconds to milliseconds
        attempts: 1,
        removeOnComplete: 50,
        removeOnFail: 25
      });

      console.log(`⏰ Added game timer job ${job.id} with ${delay}s delay`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add game timer to queue:', error.message);
      return null;
    }
  }

  // Process different message types
  async processMessage(data) {
    const { to, message } = data;
    const whatsappService = require('./whatsappService');

    try {
      const result = await whatsappService.sendMessage(to, message);
      console.log('📤 Message sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  async processTemplate(data) {
    const { to, templateName, parameters } = data;
    const whatsappService = require('./whatsappService');

    try {
      const result = await whatsappService.sendTemplate(to, templateName, parameters);
      console.log('📤 Template sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send template:', error);
      throw error;
    }
  }

  async processGameTimer(data) {
    const { gameId, action } = data;
    const gameService = require('./gameService');

    try {
      switch (action) {
        case 'start_game':
          await gameService.startGame(gameId);
          break;
        case 'end_game':
          await gameService.endGame(gameId);
          break;
        case 'next_question':
          await gameService.nextQuestion(gameId);
          break;
        default:
          console.log('⚠️  Unknown game timer action:', action);
      }
      console.log(`⏰ Game timer action '${action}' completed for game ${gameId}`);
    } catch (error) {
      console.error('❌ Failed to process game timer:', error);
      throw error;
    }
  }

  async processQuestionTimer(data) {
    const { gameId, questionId } = data;
    const gameService = require('./gameService');

    try {
      await gameService.timeoutQuestion(gameId, questionId);
      console.log(`❓ Question timer completed for game ${gameId}, question ${questionId}`);
    } catch (error) {
      console.error('❌ Failed to process question timer:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    if (!this.messageQueue || !this.gameQueue) {
      return {
        messageQueue: { available: false },
        gameQueue: { available: false }
      };
    }

    try {
      const messageStats = {
        available: true,
        waiting: await this.messageQueue.getWaiting(),
        active: await this.messageQueue.getActive(),
        completed: await this.messageQueue.getCompleted(),
        failed: await this.messageQueue.getFailed()
      };

      const gameStats = {
        available: true,
        waiting: await this.gameQueue.getWaiting(),
        active: await this.gameQueue.getActive(),
        completed: await this.gameQueue.getCompleted(),
        failed: await this.gameQueue.getFailed()
      };

      return {
        messageQueue: messageStats,
        gameQueue: gameStats
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error.message);
      return {
        messageQueue: { available: false, error: error.message },
        gameQueue: { available: false, error: error.message }
      };
    }
  }

  // Clean up queues
  async cleanup() {
    console.log('🧹 Cleaning up queues...');
    
    if (this.messageQueue) {
      await this.messageQueue.close();
    }
    
    if (this.gameQueue) {
      await this.gameQueue.close();
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
    
    console.log('✅ Queue cleanup completed');
  }
}

// Create singleton instance
const queueService = new QueueService();

module.exports = queueService;