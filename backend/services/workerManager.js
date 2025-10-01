/**
 * Worker Manager Service
 * Manages worker threads for CPU-intensive operations
 * Provides a clean interface for main thread to communicate with workers
 */

const { Worker } = require('worker_threads');
const path = require('path');

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.workerPromises = new Map();
    this.workerCounter = 0;
    
    console.log('✅ Worker Manager initialized');
  }

  /**
   * Create a new worker thread
   * @param {string} workerType - Type of worker (answer-processor, game-state-processor, message-processor)
   * @returns {Worker} Worker instance
   */
  createWorker(workerType) {
    const workerPath = path.join(__dirname, '..', 'workers', `${workerType}.js`);
    const worker = new Worker(workerPath);
    
    const workerId = `worker_${workerType}_${++this.workerCounter}`;
    this.workers.set(workerId, worker);
    
    // Handle worker messages
    worker.on('message', (result) => {
      const promiseId = `${workerId}_${Date.now()}`;
      if (this.workerPromises.has(promiseId)) {
        const { resolve, reject } = this.workerPromises.get(promiseId);
        this.workerPromises.delete(promiseId);
        
        if (result.success) {
          resolve(result.result);
        } else {
          reject(new Error(result.error.message));
        }
      }
    });
    
    // Handle worker errors
    worker.on('error', (error) => {
      console.error(`Worker ${workerId} error:`, error);
      this.cleanupWorker(workerId);
    });
    
    // Handle worker exit
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker ${workerId} exited with code ${code}`);
      }
      this.cleanupWorker(workerId);
    });
    
    console.log(`✅ Created worker: ${workerId}`);
    return { workerId, worker };
  }

  /**
   * Send message to worker and wait for response
   * @param {string} workerId - Worker ID
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {Promise} Worker response
   */
  async sendMessage(workerId, type, data) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }
    
    return new Promise((resolve, reject) => {
      const promiseId = `${workerId}_${Date.now()}`;
      this.workerPromises.set(promiseId, { resolve, reject });
      
      // Set timeout for worker response
      const timeout = setTimeout(() => {
        this.workerPromises.delete(promiseId);
        reject(new Error(`Worker ${workerId} timeout`));
      }, 30000); // 30 second timeout
      
      // Override resolve/reject to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.workerPromises.set(promiseId, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });
      
      worker.postMessage({ type, data });
    });
  }

  /**
   * Process answers using worker thread
   * @param {string} gameId - Game ID
   * @param {number} questionIndex - Question index
   * @param {Object} answers - User answers
   * @param {string} correctAnswer - Correct answer
   * @param {number} timeLimit - Time limit in milliseconds
   * @returns {Promise<Object>} Evaluation results
   */
  async processAnswers(gameId, questionIndex, answers, correctAnswer, timeLimit = 10000) {
    const { workerId } = this.createWorker('answer-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'process_answers', {
        gameId,
        questionIndex,
        answers,
        correctAnswer,
        timeLimit
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Process game state using worker thread
   * @param {Object} gameState - Game state
   * @param {Object} answerResults - Answer results
   * @returns {Promise<Object>} Updated game state
   */
  async processGameState(gameState, answerResults) {
    const { workerId } = this.createWorker('game-state-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'process_game_state', {
        gameState,
        answerResults
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Validate game state using worker thread
   * @param {Object} gameState - Game state to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateGameState(gameState) {
    const { workerId } = this.createWorker('game-state-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'validate_game_state', {
        gameState
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Process message batch using worker thread
   * @param {Array} messages - Array of messages
   * @returns {Promise<Object>} Processed message batches
   */
  async processMessageBatch(messages) {
    const { workerId } = this.createWorker('message-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'process_message_batch', {
        messages
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Format message using worker thread
   * @param {Object} message - Message to format
   * @returns {Promise<Object>} Formatted message
   */
  async formatMessage(message) {
    const { workerId } = this.createWorker('message-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'format_message', {
        message
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Calculate prize distribution using worker thread
   * @param {Array} winners - Array of winner user IDs
   * @param {number} totalPrize - Total prize pool
   * @returns {Promise<Object>} Prize distribution
   */
  async calculatePrizeDistribution(winners, totalPrize) {
    const { workerId } = this.createWorker('answer-processor');
    
    try {
      const result = await this.sendMessage(workerId, 'calculate_prizes', {
        winners,
        totalPrize
      });
      
      return result;
    } finally {
      this.cleanupWorker(workerId);
    }
  }

  /**
   * Cleanup worker thread
   * @param {string} workerId - Worker ID to cleanup
   */
  cleanupWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      console.log(`🧹 Cleaned up worker: ${workerId}`);
    }
  }

  /**
   * Get worker statistics
   * @returns {Object} Worker statistics
   */
  getStats() {
    return {
      activeWorkers: this.workers.size,
      pendingPromises: this.workerPromises.size,
      workerTypes: Array.from(this.workers.keys())
    };
  }

  /**
   * Cleanup all workers
   */
  cleanup() {
    console.log('🧹 Cleaning up all workers...');
    
    for (const [workerId, worker] of this.workers) {
      worker.terminate();
    }
    
    this.workers.clear();
    this.workerPromises.clear();
    
    console.log('✅ All workers cleaned up');
  }
}

// Export singleton instance
const workerManager = new WorkerManager();
module.exports = workerManager;
