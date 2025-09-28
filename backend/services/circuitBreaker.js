/**
 * Circuit Breaker for 1000+ User Load
 * Prevents system overload by stopping processing when error rates exceed thresholds
 */

class CircuitBreaker {
  constructor() {
    this.states = {
      CLOSED: 'CLOSED',     // Normal operation
      OPEN: 'OPEN',         // Circuit is open, requests are blocked
      HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
    };

    this.circuits = new Map(); // service -> circuit state
    this.errorCounts = new Map(); // service -> error count
    this.successCounts = new Map(); // service -> success count
    this.lastFailureTimes = new Map(); // service -> last failure time

    // Configuration
    this.failureThreshold = 10; // Open circuit after 10 failures
    this.recoveryTimeout = 30000; // 30 seconds before trying again
    this.successThreshold = 5; // Close circuit after 5 successes
  }

  // Execute function with circuit breaker protection
  async execute(serviceName, operation, fallback = null) {
    const circuit = this.getCircuit(serviceName);
    
    if (circuit.state === this.states.OPEN) {
      if (this.shouldAttemptReset(serviceName)) {
        circuit.state = this.states.HALF_OPEN;
        console.log(`🔄 Circuit breaker for ${serviceName} moved to HALF_OPEN`);
      } else {
        console.log(`🚫 Circuit breaker for ${serviceName} is OPEN, blocking request`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker for ${serviceName} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(serviceName);
      
      if (circuit.state === this.states.HALF_OPEN) {
        circuit.state = this.states.CLOSED;
        console.log(`✅ Circuit breaker for ${serviceName} moved to CLOSED`);
      }
      
      return result;
    } catch (error) {
      this.recordFailure(serviceName);
      
      if (this.shouldOpenCircuit(serviceName)) {
        circuit.state = this.states.OPEN;
        circuit.lastFailureTime = Date.now();
        console.log(`🚨 Circuit breaker for ${serviceName} moved to OPEN`);
      }
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  // Get circuit state for service
  getCircuit(serviceName) {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: this.states.CLOSED,
        lastFailureTime: null
      });
    }
    return this.circuits.get(serviceName);
  }

  // Record successful operation
  recordSuccess(serviceName) {
    const current = this.successCounts.get(serviceName) || 0;
    this.successCounts.set(serviceName, current + 1);
    
    // Reset error count on success
    this.errorCounts.set(serviceName, 0);
  }

  // Record failed operation
  recordFailure(serviceName) {
    const current = this.errorCounts.get(serviceName) || 0;
    this.errorCounts.set(serviceName, current + 1);
    this.lastFailureTimes.set(serviceName, Date.now());
    
    // Reset success count on failure
    this.successCounts.set(serviceName, 0);
  }

  // Check if circuit should be opened
  shouldOpenCircuit(serviceName) {
    const errorCount = this.errorCounts.get(serviceName) || 0;
    return errorCount >= this.failureThreshold;
  }

  // Check if circuit should attempt reset
  shouldAttemptReset(serviceName) {
    const circuit = this.getCircuit(serviceName);
    const lastFailureTime = circuit.lastFailureTime;
    
    if (!lastFailureTime) return true;
    
    return Date.now() - lastFailureTime >= this.recoveryTimeout;
  }

  // Get circuit breaker status
  getStatus(serviceName) {
    const circuit = this.getCircuit(serviceName);
    const errorCount = this.errorCounts.get(serviceName) || 0;
    const successCount = this.successCounts.get(serviceName) || 0;
    
    return {
      service: serviceName,
      state: circuit.state,
      errorCount,
      successCount,
      lastFailureTime: circuit.lastFailureTime,
      shouldAttemptReset: this.shouldAttemptReset(serviceName)
    };
  }

  // Get all circuit breaker statuses
  getAllStatuses() {
    const statuses = [];
    for (const serviceName of this.circuits.keys()) {
      statuses.push(this.getStatus(serviceName));
    }
    return statuses;
  }

  // Reset circuit breaker for service
  resetCircuit(serviceName) {
    this.circuits.set(serviceName, {
      state: this.states.CLOSED,
      lastFailureTime: null
    });
    this.errorCounts.set(serviceName, 0);
    this.successCounts.set(serviceName, 0);
    console.log(`🔄 Circuit breaker for ${serviceName} has been reset`);
  }

  // Reset all circuit breakers
  resetAllCircuits() {
    this.circuits.clear();
    this.errorCounts.clear();
    this.successCounts.clear();
    this.lastFailureTimes.clear();
    console.log(`🔄 All circuit breakers have been reset`);
  }

  // Protected operations for common services
  async protectedMessageSend(operation) {
    return await this.execute('message_send', operation, () => {
      console.log('⚠️ Message send circuit breaker activated, using fallback');
      return { message: 'circuit_breaker_fallback' };
    });
  }

  async protectedDatabaseOperation(operation) {
    return await this.execute('database', operation, () => {
      console.log('⚠️ Database circuit breaker activated, using fallback');
      throw new Error('Database circuit breaker is OPEN');
    });
  }

  async protectedGameStateOperation(operation) {
    return await this.execute('game_state', operation, () => {
      console.log('⚠️ Game state circuit breaker activated, using fallback');
      throw new Error('Game state circuit breaker is OPEN');
    });
  }
}

module.exports = CircuitBreaker;
