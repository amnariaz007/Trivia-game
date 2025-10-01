/**
 * Answer Manager - Hashmap-based answer evaluation for concurrent users
 * Stores answers in Redis with deduplication and timeout handling
 */

const Redis = require('ioredis');

class AnswerManager {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.keyPrefix = 'qrush:answers:';
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      this.redis.on('connect', () => {
        this.connected = true;
        console.log('✅ Answer Manager Redis connected');
      });
      
      this.redis.on('error', (error) => {
        this.connected = false;
        console.error('❌ Answer Manager Redis error:', error);
      });
      
      this.redis.on('close', () => {
        this.connected = false;
        console.log('⚠️  Answer Manager Redis connection closed');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Answer Manager Redis:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.connected && this.redis;
  }

  /**
   * Record player answer with deduplication
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @param {string} userId - User ID
   * @param {string} answer - Player's answer
   * @returns {Promise<Object>} Result object
   */
  async recordAnswer(gameId, questionIndex, userId, answer) {
    if (!this.isAvailable()) {
      console.log('⚠️  Redis not available, using fallback storage');
      return { status: 'fallback', message: 'Redis not available' };
    }

    try {
      const key = `${this.keyPrefix}${gameId}:${questionIndex}`;
      const userKey = `${key}:${userId}`;
      
      // Check if user already answered (prevent duplicates)
      const existing = await this.redis.get(userKey);
      if (existing) {
        const existingData = JSON.parse(existing);
        return { 
          status: 'duplicate', 
          message: 'Already answered',
          existingAnswer: existingData.answer,
          timestamp: existingData.timestamp
        };
      }
      
      // Store answer with timestamp
      const answerData = {
        answer: answer.trim().toLowerCase(),
        timestamp: Date.now(),
        userId: userId,
        questionIndex: questionIndex
      };
      
      // Store with 5 minute TTL (longer than game duration)
      await this.redis.setex(userKey, 300, JSON.stringify(answerData));
      
      console.log(`✅ Answer recorded: ${userId} -> "${answer}" for Q${questionIndex + 1}`);
      return { 
        status: 'recorded', 
        message: 'Answer recorded successfully',
        timestamp: answerData.timestamp
      };
      
    } catch (error) {
      console.error('❌ Error recording answer:', error);
      return { status: 'error', message: 'Failed to record answer' };
    }
  }

  /**
   * Evaluate all answers for a question after timer expires
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @param {string} correctAnswer - Correct answer
   * @param {number} timeLimit - Time limit in milliseconds (default: 10000)
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateAnswers(gameId, questionIndex, correctAnswer, timeLimit = 10000) {
    if (!this.isAvailable()) {
      console.log('⚠️  Redis not available for answer evaluation');
      return { error: 'Redis not available' };
    }

    try {
      const key = `${this.keyPrefix}${gameId}:${questionIndex}`;
      const pattern = `${key}:*`;
      
      // Get all answer keys for this question
      const keys = await this.redis.keys(pattern);
      const results = {
        totalAnswers: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        lateAnswers: 0,
        playerResults: {}
      };
      
      const correctAnswerLower = correctAnswer.trim().toLowerCase();
      const cutoffTime = Date.now() - timeLimit;
      
      for (const key of keys) {
        try {
          const answerData = JSON.parse(await this.redis.get(key));
          const userId = answerData.userId;
          const timeDiff = Date.now() - answerData.timestamp;
          
          results.totalAnswers++;
          
          if (answerData.timestamp < cutoffTime) {
            // Answer was too late
            results.lateAnswers++;
            results.playerResults[userId] = {
              correct: false,
              responseTime: timeDiff,
              reason: 'late',
              answer: answerData.answer
            };
          } else {
            // Answer was on time, check correctness
            const isCorrect = answerData.answer === correctAnswerLower;
            
            if (isCorrect) {
              results.correctAnswers++;
            } else {
              results.wrongAnswers++;
            }
            
            results.playerResults[userId] = {
              correct: isCorrect,
              responseTime: timeDiff,
              reason: isCorrect ? 'correct' : 'wrong',
              answer: answerData.answer
            };
          }
        } catch (parseError) {
          console.error('❌ Error parsing answer data:', parseError);
        }
      }
      
      console.log(`📊 Answer evaluation for Q${questionIndex + 1}: ${results.correctAnswers} correct, ${results.wrongAnswers} wrong, ${results.lateAnswers} late`);
      return results;
      
    } catch (error) {
      console.error('❌ Error evaluating answers:', error);
      return { error: 'Failed to evaluate answers' };
    }
  }

  /**
   * Get all answers for a specific question (for debugging)
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @returns {Promise<Array>} Array of answers
   */
  async getAnswersForQuestion(gameId, questionIndex) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const key = `${this.keyPrefix}${gameId}:${questionIndex}`;
      const pattern = `${key}:*`;
      
      const keys = await this.redis.keys(pattern);
      const answers = [];
      
      for (const key of keys) {
        const answerData = JSON.parse(await this.redis.get(key));
        answers.push(answerData);
      }
      
      return answers;
    } catch (error) {
      console.error('❌ Error getting answers for question:', error);
      return [];
    }
  }

  /**
   * Clear all answers for a game (cleanup)
   * @param {string} gameId - Game ID
   * @returns {Promise<boolean>} Success status
   */
  async clearGameAnswers(gameId) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const pattern = `${this.keyPrefix}${gameId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🧹 Cleared ${keys.length} answer records for game ${gameId}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing game answers:', error);
      return false;
    }
  }

  /**
   * Get Redis connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      available: this.isAvailable()
    };
  }
}

// Export singleton instance
const answerManager = new AnswerManager();
module.exports = answerManager;

