/**
 * Performance Monitor for 1000+ User Load
 * Tracks system performance metrics and provides real-time monitoring
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // Request metrics
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      
      // Game metrics
      activeGames: 0,
      totalGamesStarted: 0,
      totalGamesCompleted: 0,
      
      // User metrics
      activeUsers: 0,
      totalUsers: 0,
      newUsersToday: 0,
      
      // System metrics
      memoryUsage: 0,
      cpuUsage: 0,
      databaseConnections: 0,
      
      // Queue metrics
      messageQueueSize: 0,
      gameQueueSize: 0,
      processedMessages: 0,
      
      // Error tracking
      errors: [],
      errorRate: 0,
      
      // Timestamps
      lastUpdated: new Date(),
      startTime: new Date()
    };

    this.history = [];
    this.maxHistorySize = 100; // Keep last 100 measurements
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('✅ Performance Monitor initialized');
  }

  /**
   * Start the monitoring process
   */
  startMonitoring() {
    // Update metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.saveToHistory();
    }, 30000);

    // Log performance summary every 5 minutes
    this.loggingInterval = setInterval(() => {
      this.logPerformanceSummary();
    }, 300000);
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    try {
      // Update memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB

      // Update timestamps
      this.metrics.lastUpdated = new Date();

      // Calculate uptime
      const uptime = Date.now() - this.metrics.startTime.getTime();
      this.metrics.uptime = Math.round(uptime / 1000); // seconds

      // Calculate error rate
      if (this.metrics.totalRequests > 0) {
        this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
      }

    } catch (error) {
      console.error('❌ Error updating system metrics:', error);
    }
  }

  /**
   * Record a request
   * @param {string} endpoint - API endpoint
   * @param {number} responseTime - Response time in ms
   * @param {boolean} success - Whether request was successful
   */
  recordRequest(endpoint, responseTime, success = true) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;

    // Record error if failed
    if (!success) {
      this.recordError(`Request failed: ${endpoint}`, { endpoint, responseTime });
    }
  }

  /**
   * Record a game event
   * @param {string} event - Game event type
   * @param {Object} data - Event data
   */
  recordGameEvent(event, data = {}) {
    switch (event) {
      case 'game_started':
        this.metrics.totalGamesStarted++;
        this.metrics.activeGames++;
        break;
      case 'game_completed':
        this.metrics.totalGamesCompleted++;
        this.metrics.activeGames = Math.max(0, this.metrics.activeGames - 1);
        break;
      case 'game_cancelled':
        this.metrics.activeGames = Math.max(0, this.metrics.activeGames - 1);
        break;
    }
  }

  /**
   * Record user metrics
   * @param {string} event - User event type
   * @param {number} count - Number of users
   */
  recordUserEvent(event, count = 1) {
    switch (event) {
      case 'user_registered':
        this.metrics.totalUsers += count;
        this.metrics.newUsersToday += count;
        break;
      case 'user_active':
        this.metrics.activeUsers = count;
        break;
    }
  }

  /**
   * Record queue metrics
   * @param {string} queueType - Type of queue
   * @param {number} size - Queue size
   * @param {number} processed - Number of processed items
   */
  recordQueueMetrics(queueType, size, processed = 0) {
    switch (queueType) {
      case 'message':
        this.metrics.messageQueueSize = size;
        this.metrics.processedMessages += processed;
        break;
      case 'game':
        this.metrics.gameQueueSize = size;
        break;
    }
  }

  /**
   * Record an error
   * @param {string} message - Error message
   * @param {Object} context - Error context
   */
  recordError(message, context = {}) {
    const error = {
      message,
      context,
      timestamp: new Date(),
      stack: new Error().stack
    };

    this.metrics.errors.push(error);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }

  /**
   * Save current metrics to history
   */
  saveToHistory() {
    const snapshot = {
      ...this.metrics,
      timestamp: new Date()
    };

    this.history.push(snapshot);

    // Keep only last N measurements
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get performance history
   * @param {number} limit - Number of recent measurements to return
   * @returns {Array} Performance history
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getSummary() {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 100) / 100;

    return {
      uptime: `${uptimeHours} hours`,
      totalRequests: this.metrics.totalRequests,
      successRate: this.metrics.totalRequests > 0 ? 
        Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100) : 0,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      activeGames: this.metrics.activeGames,
      totalUsers: this.metrics.totalUsers,
      memoryUsage: `${this.metrics.memoryUsage} MB`,
      errorRate: Math.round(this.metrics.errorRate * 100) / 100,
      recentErrors: this.metrics.errors.slice(-5)
    };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary() {
    const summary = this.getSummary();
    
    console.log('\n📊 Performance Summary:');
    console.log(`⏱️  Uptime: ${summary.uptime}`);
    console.log(`📈 Total Requests: ${summary.totalRequests}`);
    console.log(`✅ Success Rate: ${summary.successRate}%`);
    console.log(`⚡ Avg Response Time: ${summary.averageResponseTime}ms`);
    console.log(`🎮 Active Games: ${summary.activeGames}`);
    console.log(`👥 Total Users: ${summary.totalUsers}`);
    console.log(`💾 Memory Usage: ${summary.memoryUsage}`);
    console.log(`❌ Error Rate: ${summary.errorRate}%`);
    
    if (summary.recentErrors.length > 0) {
      console.log(`🚨 Recent Errors: ${summary.recentErrors.length}`);
    }
    console.log('');
  }

  /**
   * Check if system is healthy
   * @returns {Object} Health status
   */
  checkHealth() {
    const issues = [];
    
    // Check error rate
    if (this.metrics.errorRate > 10) {
      issues.push(`High error rate: ${this.metrics.errorRate}%`);
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > 500) {
      issues.push(`High memory usage: ${this.metrics.memoryUsage}MB`);
    }
    
    // Check response time
    if (this.metrics.averageResponseTime > 5000) {
      issues.push(`Slow response time: ${this.metrics.averageResponseTime}ms`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: this.getMetrics()
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeGames: 0,
      totalGamesStarted: 0,
      totalGamesCompleted: 0,
      activeUsers: 0,
      totalUsers: this.metrics.totalUsers, // Keep total users
      newUsersToday: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      databaseConnections: 0,
      messageQueueSize: 0,
      gameQueueSize: 0,
      processedMessages: 0,
      errors: [],
      errorRate: 0,
      lastUpdated: new Date(),
      startTime: new Date()
    };
    
    console.log('🔄 Performance metrics reset');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
    console.log('⏹️ Performance monitoring stopped');
  }
}

module.exports = PerformanceMonitor;
