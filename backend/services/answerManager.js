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
   * Record player answer with Unix timestamp for fast processing
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @param {string} userId - User ID
   * @param {string} answer - Player's answer
   * @param {number} questionStartTime - Unix timestamp when question started
   * @param {number} timeLimit - Time limit in milliseconds
   * @returns {Promise<Object>} Result object with timing validation
   */
  async recordAnswer(gameId, questionIndex, userId, answer, questionStartTime, timeLimit) {
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
          timestamp: existingData.timestamp,
          isOnTime: existingData.isOnTime
        };
      }
      
      // Use current timestamp for answer (Unix timestamp)
      const answerTimestamp = Date.now();
      
      // Calculate time since question start but don't validate yet
      const timeSinceQuestionStart = answerTimestamp - questionStartTime;
      
      // Store answer with timestamp - timing validation happens after timer expires
      const answerData = {
        answer: answer.trim().toLowerCase(),
        timestamp: answerTimestamp,
        questionStartTime: questionStartTime,
        timeSinceStart: timeSinceQuestionStart,
        timeLimit: timeLimit,
        userId: userId,
        questionIndex: questionIndex,
        questionId: null, // Will be set when we have the actual question ID
        gameId: gameId,
        evaluated: false // Will be set to true after timer expires
      };
      
      // Store with 5 minute TTL (longer than game duration)
      await this.redis.setex(userKey, 300, JSON.stringify(answerData));
      
      console.log(`✅ Answer recorded: ${userId} -> "${answer}" for Q${questionIndex + 1} (${timeSinceQuestionStart}ms, evaluation pending)`);
      
      return { 
        status: 'recorded', 
        message: 'Answer recorded successfully - evaluation pending timer expiration',
        timestamp: answerData.timestamp,
        timeSinceStart: timeSinceQuestionStart,
        timeLimit: timeLimit
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
      
      // Get all answer keys for this question (using safe scan)
      const keys = await this.safeRedisScan(pattern);
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
      
      const keys = await this.safeRedisScan(pattern);
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
   * Get a specific player's answer from Redis (fast lookup)
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Answer data or null
   */
  async getPlayerAnswer(gameId, questionIndex, userId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = `${this.keyPrefix}${gameId}:${questionIndex}`;
      const userKey = `${key}:${userId}`;
      
      const answerData = await this.redis.get(userKey);
      return answerData ? JSON.parse(answerData) : null;
    } catch (error) {
      console.error('❌ Error getting player answer:', error);
      return null;
    }
  }

  /**
   * Evaluate all answers after timer expires (timing validation)
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @param {string} correctAnswer - Correct answer for the question
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateAnswersAfterTimer(gameId, questionIndex, correctAnswer) {
    if (!this.isAvailable()) {
      return { error: 'Redis not available' };
    }

    try {
      const answers = await this.getAnswersForQuestion(gameId, questionIndex);
      const results = {
        totalAnswers: answers.length,
        onTimeAnswers: 0,
        lateAnswers: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        playerResults: {}
      };

      for (const answerData of answers) {
        const userId = answerData.userId;
        
        // Validate timing with a small buffer to account for processing delays
        const timeBuffer = 1000; // 1 second buffer for processing delays
        const isOnTime = answerData.timeSinceStart <= (answerData.timeLimit + timeBuffer);
        
        // Robust answer comparison - normalize both answers
        const normalizedPlayerAnswer = answerData.answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const normalizedCorrectAnswer = correctAnswer.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const isCorrect = normalizedPlayerAnswer === normalizedCorrectAnswer;
        
        console.log(`🎯 [EVALUATION] Player ${userId}: answer="${answerData.answer}", timeSinceStart=${answerData.timeSinceStart}ms, timeLimit=${answerData.timeLimit}ms, isOnTime=${isOnTime}, isCorrect=${isCorrect}`);
        console.log(`🎯 [EVALUATION] Answer comparison: "${normalizedPlayerAnswer}" === "${normalizedCorrectAnswer}" = ${isCorrect}`);
        
        // Update the answer data with evaluation results
        answerData.isOnTime = isOnTime;
        answerData.isCorrect = isCorrect;
        answerData.evaluated = true;
        
        // Update in Redis
        const key = `${this.keyPrefix}${gameId}:${questionIndex}`;
        const userKey = `${key}:${userId}`;
        await this.redis.setex(userKey, 300, JSON.stringify(answerData));
        
        // Count results
        if (isOnTime) {
          results.onTimeAnswers++;
          if (isCorrect) {
            results.correctAnswers++;
          } else {
            results.wrongAnswers++;
          }
        } else {
          results.lateAnswers++;
        }
        
        results.playerResults[userId] = {
          answer: answerData.answer,
          isOnTime: isOnTime,
          isCorrect: isCorrect,
          timeSinceStart: answerData.timeSinceStart,
          timeLimit: answerData.timeLimit
        };
      }

      console.log(`📊 Answer evaluation completed: ${results.onTimeAnswers} on-time, ${results.lateAnswers} late, ${results.correctAnswers} correct, ${results.wrongAnswers} wrong`);
      
      return results;
    } catch (error) {
      console.error('❌ Error evaluating answers after timer:', error);
      return { error: 'Failed to evaluate answers' };
    }
  }

  /**
   * Batch save answers to database after question ends
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index (0-based)
   * @returns {Promise<Object>} Save results
   */
  async batchSaveAnswersToDatabase(gameId, questionIndex) {
    if (!this.isAvailable()) {
      return { error: 'Redis not available' };
    }

    try {
      const answers = await this.getAnswersForQuestion(gameId, questionIndex);
      const { PlayerAnswer, Question } = require('../models');
      
      // Get the actual question ID from database
      const game = await require('../models').Game.findByPk(gameId, {
        include: [{ model: Question, as: 'questions' }]
      });
      
      if (!game || !game.questions || !game.questions[questionIndex]) {
        console.error(`❌ Question not found for game ${gameId}, question ${questionIndex}`);
        return { error: 'Question not found' };
      }
      
      const questionId = game.questions[questionIndex].id;
      
      const savePromises = answers.map(async (answerData) => {
        try {
          await PlayerAnswer.create({
            game_id: gameId,
            user_id: answerData.userId,
            question_id: questionId, // Use the actual question ID from database
            selected_answer: answerData.answer,
            is_correct: answerData.isCorrect,
            response_time_ms: answerData.timeSinceStart,
            question_number: questionIndex + 1,
            answer_timestamp: new Date(answerData.timestamp)
          });
          return { success: true, userId: answerData.userId };
        } catch (error) {
          console.error(`❌ Error saving answer for user ${answerData.userId}:`, error);
          return { success: false, userId: answerData.userId, error: error.message };
        }
      });

      const results = await Promise.all(savePromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      console.log(`📊 Batch save results: ${successCount} successful, ${errorCount} errors`);
      
      return {
        totalAnswers: answers.length,
        successfulSaves: successCount,
        errors: errorCount,
        results: results
      };
    } catch (error) {
      console.error('❌ Error in batch save:', error);
      return { error: 'Failed to batch save answers' };
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
      const keys = await this.safeRedisScan(pattern);
      
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

  // Safe Redis scan to replace dangerous keys() command
  async safeRedisScan(pattern) {
    try {
      const keys = [];
      let cursor = '0';
      
      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      console.error('❌ Error scanning Redis keys:', error);
      return [];
    }
  }
}

// Export singleton instance
const answerManager = new AnswerManager();
module.exports = answerManager;

