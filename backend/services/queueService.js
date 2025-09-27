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
      console.log('⚠️  REDIS_URL not found, running without Redis queues');
      return;
    }

    try {
      console.log('🔄 Creating Redis connection...');

      // Auto-detect TLS based on rediss:// scheme
      const needsTLS = process.env.REDIS_URL.startsWith("rediss://");

      this.redis = new Redis(process.env.REDIS_URL, {
        tls: needsTLS ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000, // more lenient timeout
        family: 4, // IPv4
        keepAlive: 30000,
      });

      this.redis.on("connect", () => {
        console.log("✅ Connected to Redis");
        this.redisConnected = true;
        this.initializeQueues();
      });

      this.redis.on("error", (err) => {
        console.error("❌ Redis connection failed:", err.message);
        console.log("⚠️  Continuing without Redis - app will work with reduced functionality");
        this.redisConnected = false;
        this.redis = null;
      });

      this.redis.on("close", () => {
        console.log("⚠️  Redis connection closed");
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
      console.error('❌ Failed to initialize Redis:', error.message);
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
  
      // Just pass the URL (Bull handles redis:// vs rediss:// automatically)
      this.messageQueue = new Queue('whatsapp-messages', process.env.REDIS_URL);
      this.gameQueue = new Queue('game-timers', process.env.REDIS_URL);
  
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
    if (!this.messageQueue) {
      console.log('⚠️  Message queue not available, skipping message');
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
      console.log(`⏰ Added game timer job ${job.id} with ${delay}s delay`);
      return job;
    } catch (error) {
      console.error('❌ Failed to add game timer to queue:', error.message);
      return null;
    }
  }

  async processMessage(data) {
    const { to, message } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendMessage(to, message);
  }

  async processTemplate(data) {
    const { to, templateName, parameters } = data;
    const whatsappService = require('./whatsappService');
    return await whatsappService.sendTemplate(to, templateName, parameters);
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
    const { gameId, questionId } = data;
    const gameService = require('./gameService');
    return await gameService.timeoutQuestion(gameId, questionId);
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
