/**
 * Game State Processor Worker Thread
 * Handles CPU-intensive game state calculations and validations
 * Runs in separate thread to avoid blocking main event loop
 */

const { parentPort, workerData } = require('worker_threads');

/**
 * Validate game state consistency
 * @param {Object} gameState - Game state to validate
 * @returns {Object} Validation results
 */
function validateGameState(gameState) {
  const issues = [];
  const warnings = [];
  
  // Check required fields
  if (!gameState.id) issues.push('Missing game ID');
  if (!gameState.status) issues.push('Missing game status');
  if (!gameState.players || !Array.isArray(gameState.players)) {
    issues.push('Missing or invalid players array');
  }
  
  // Validate player data
  if (gameState.players) {
    gameState.players.forEach((player, index) => {
      if (!player.user || !player.user.id) {
        issues.push(`Player ${index} missing user ID`);
      }
      if (!player.status) {
        issues.push(`Player ${index} missing status`);
      }
      if (!['alive', 'eliminated', 'registered'].includes(player.status)) {
        issues.push(`Player ${index} has invalid status: ${player.status}`);
      }
    });
  }
  
  // Check game progression
  if (gameState.currentQuestion < 0) {
    issues.push('Current question cannot be negative');
  }
  if (gameState.questions && gameState.currentQuestion >= gameState.questions.length) {
    warnings.push('Current question exceeds total questions');
  }
  
  // Check player counts
  const alivePlayers = gameState.players ? gameState.players.filter(p => p.status === 'alive').length : 0;
  if (alivePlayers === 0 && gameState.status === 'in_progress') {
    warnings.push('Game in progress but no alive players');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    alivePlayers,
    totalPlayers: gameState.players ? gameState.players.length : 0
  };
}

/**
 * Calculate game statistics
 * @param {Object} gameState - Game state
 * @returns {Object} Game statistics
 */
function calculateGameStats(gameState) {
  const stats = {
    totalPlayers: 0,
    alivePlayers: 0,
    eliminatedPlayers: 0,
    registeredPlayers: 0,
    currentQuestion: gameState.currentQuestion || 0,
    totalQuestions: gameState.questions ? gameState.questions.length : 0,
    gameProgress: 0,
    averageResponseTime: 0,
    eliminationRate: 0
  };
  
  if (!gameState.players) return stats;
  
  stats.totalPlayers = gameState.players.length;
  
  // Count players by status
  gameState.players.forEach(player => {
    switch (player.status) {
      case 'alive':
        stats.alivePlayers++;
        break;
      case 'eliminated':
        stats.eliminatedPlayers++;
        break;
      case 'registered':
        stats.registeredPlayers++;
        break;
    }
  });
  
  // Calculate game progress
  if (stats.totalQuestions > 0) {
    stats.gameProgress = Math.round((stats.currentQuestion / stats.totalQuestions) * 100);
  }
  
  // Calculate elimination rate
  if (stats.totalPlayers > 0) {
    stats.eliminationRate = Math.round((stats.eliminatedPlayers / stats.totalPlayers) * 100);
  }
  
  // Calculate average response time
  const responseTimes = gameState.players
    .filter(p => p.lastAnswerTime)
    .map(p => p.lastAnswerTime);
  
  if (responseTimes.length > 0) {
    stats.averageResponseTime = Math.round(
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    );
  }
  
  return stats;
}

/**
 * Optimize game state for storage
 * @param {Object} gameState - Game state to optimize
 * @returns {Object} Optimized game state
 */
function optimizeGameState(gameState) {
  const optimized = { ...gameState };
  
  // Remove unnecessary fields
  delete optimized.tempData;
  delete optimized.debugInfo;
  
  // Optimize player data
  if (optimized.players) {
    optimized.players = optimized.players.map(player => ({
      id: player.id,
      user: {
        id: player.user.id,
        nickname: player.user.nickname,
        whatsapp_number: player.user.whatsapp_number
      },
      status: player.status,
      answer: player.answer,
      answerTime: player.answerTime,
      eliminatedAt: player.eliminatedAt,
      eliminatedOnQuestion: player.eliminatedOnQuestion,
      eliminationReason: player.eliminationReason,
      lastAnswer: player.lastAnswer,
      lastAnswerTime: player.lastAnswerTime
    }));
  }
  
  // Add metadata
  optimized.metadata = {
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    optimized: true
  };
  
  return optimized;
}

/**
 * Merge game state updates
 * @param {Object} currentState - Current game state
 * @param {Object} updates - Updates to apply
 * @returns {Object} Merged game state
 */
function mergeGameState(currentState, updates) {
  const merged = { ...currentState };
  
  // Apply direct updates
  Object.keys(updates).forEach(key => {
    if (key !== 'players' && key !== 'metadata') {
      merged[key] = updates[key];
    }
  });
  
  // Merge player updates
  if (updates.players) {
    merged.players = currentState.players.map(player => {
      const update = updates.players.find(p => p.id === player.id);
      return update ? { ...player, ...update } : player;
    });
  }
  
  // Update metadata
  merged.metadata = {
    ...merged.metadata,
    lastUpdated: new Date().toISOString(),
    version: '1.0'
  };
  
  return merged;
}

// Handle messages from main thread
parentPort.on('message', ({ type, data }) => {
  try {
    let result;
    
    switch (type) {
      case 'validate_game_state':
        result = validateGameState(data.gameState);
        break;
        
      case 'calculate_game_stats':
        result = calculateGameStats(data.gameState);
        break;
        
      case 'optimize_game_state':
        result = optimizeGameState(data.gameState);
        break;
        
      case 'merge_game_state':
        result = mergeGameState(data.currentState, data.updates);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send result back to main thread
    parentPort.postMessage({
      success: true,
      type,
      result
    });
    
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({
      success: false,
      type,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Handle worker errors
parentPort.on('error', (error) => {
  console.error('Game State Processor Worker error:', error);
});

// Log worker startup
console.log(`Game State Processor Worker started (PID: ${process.pid})`);
