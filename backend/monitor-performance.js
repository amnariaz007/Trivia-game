/**
 * Performance Monitor for QRush Trivia
 * Monitors system performance during high load
 */

const axios = require('axios');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      responseTimes: [],
      errorCount: 0,
      successCount: 0,
      startTime: Date.now()
    };
  }

  async checkSystemHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const response = await axios.get('https://ingenious-abundance-production.up.railway.app/health', {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      
      if (response.status === 200) {
        this.metrics.successCount++;
        return {
          status: 'healthy',
          responseTime,
          timestamp: new Date().toISOString()
        };
      } else {
        this.metrics.errorCount++;
        return {
          status: 'unhealthy',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      this.metrics.errorCount++;
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async monitorDatabasePerformance() {
    try {
      // Test database connection through admin endpoint
      const response = await axios.get('https://ingenious-abundance-production.up.railway.app/admin/health', {
        timeout: 10000,
        headers: {
          'username': 'admin',
          'password': 'admin123'
        }
      });
      
      return {
        database: 'connected',
        responseTime: response.data?.responseTime || 'unknown',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        database: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async monitorRedisPerformance() {
    try {
      // Test Redis through game state endpoint
      const response = await axios.get('https://ingenious-abundance-production.up.railway.app/admin/redis-status', {
        timeout: 5000,
        headers: {
          'username': 'admin',
          'password': 'admin123'
        }
      });
      
      return {
        redis: 'connected',
        responseTime: response.data?.responseTime || 'unknown',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        redis: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getPerformanceStats() {
    const totalRequests = this.metrics.successCount + this.metrics.errorCount;
    const successRate = totalRequests > 0 ? (this.metrics.successCount / totalRequests) * 100 : 0;
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
      : 0;
    
    const maxResponseTime = Math.max(...this.metrics.responseTimes, 0);
    const minResponseTime = Math.min(...this.metrics.responseTimes, Infinity);
    
    return {
      totalRequests,
      successCount: this.metrics.successCount,
      errorCount: this.metrics.errorCount,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime: minResponseTime === Infinity ? 0 : minResponseTime,
      uptime: Date.now() - this.metrics.startTime
    };
  }

  async runContinuousMonitoring(intervalMs = 5000) {
    console.log(`🔍 Starting continuous performance monitoring (every ${intervalMs}ms)`);
    
    const monitor = async () => {
      const health = await this.checkSystemHealth();
      const db = await this.monitorDatabasePerformance();
      const redis = await this.monitorRedisPerformance();
      const stats = this.getPerformanceStats();
      
      console.log(`\n📊 Performance Report - ${new Date().toISOString()}`);
      console.log('='.repeat(60));
      console.log(`🌐 System Health: ${health.status} (${health.responseTime}ms)`);
      console.log(`🗄️  Database: ${db.database} (${db.responseTime}ms)`);
      console.log(`🔴 Redis: ${redis.redis} (${redis.responseTime}ms)`);
      console.log(`📈 Success Rate: ${stats.successRate}%`);
      console.log(`⏱️  Avg Response: ${stats.avgResponseTime}ms`);
      console.log(`📊 Total Requests: ${stats.totalRequests}`);
      console.log(`⏰ Uptime: ${Math.round(stats.uptime / 1000)}s`);
      
      // Performance alerts
      if (stats.successRate < 90) {
        console.log('🚨 ALERT: Success rate below 90%');
      }
      
      if (stats.avgResponseTime > 5000) {
        console.log('🚨 ALERT: Average response time above 5s');
      }
      
      if (stats.errorCount > 10) {
        console.log('🚨 ALERT: High error count detected');
      }
    };
    
    // Run initial check
    await monitor();
    
    // Set up interval
    const interval = setInterval(monitor, intervalMs);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('🛑 Performance monitoring stopped');
    };
  }
}

// Run monitoring if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  console.log('🚀 Starting QRush Trivia Performance Monitor');
  console.log('Press Ctrl+C to stop monitoring');
  
  const stopMonitoring = await monitor.runContinuousMonitoring(10000); // Check every 10 seconds
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping performance monitor...');
    stopMonitoring();
    process.exit(0);
  });
}

module.exports = PerformanceMonitor;
