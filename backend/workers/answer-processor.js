/**
 * Answer Processor Worker Thread
 * Handles CPU-intensive answer evaluation for multiple users
 * Runs in separate thread to avoid blocking main event loop
 */

const { parentPort, workerData } = require('worker_threads');

/**
 * Process answers for a game question
 * @param {string} gameId - Game ID
 * @param {number} questionIndex - Question index
 * @param {Object} answers - Hashmap of user answers
 * @param {string} correctAnswer - Correct answer
 * @param {number} timeLimit - Time limit in milliseconds
 * @returns {Object} Evaluation results
 */
function processAnswers(gameId, questionIndex, answers, correctAnswer, timeLimit = 10000) {
  const results = {
    gameId,
    questionIndex,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    lateAnswers: 0,
    playerResults: {},
    survivors: [],
    eliminated: []
  };

  const correctAnswerLower = correctAnswer.trim().toLowerCase();
  const cutoffTime = Date.now() - timeLimit;

  // Process each player's answer
  for (const [userId, answerData] of Object.entries(answers)) {
    results.totalAnswers++;
    
    const { answer, timestamp } = answerData;
    const timeDiff = Date.now() - timestamp;
    
    if (timestamp < cutoffTime) {
      // Answer was too late
      results.lateAnswers++;
      results.playerResults[userId] = {
        correct: false,
        responseTime: timeDiff,
        reason: 'late',
        answer: answer,
        eliminated: true
      };
      results.eliminated.push(userId);
    } else {
      // Answer was on time, check correctness
      const isCorrect = answer.trim().toLowerCase() === correctAnswerLower;
      
      if (isCorrect) {
        results.correctAnswers++;
        results.survivors.push(userId);
      } else {
        results.wrongAnswers++;
        results.eliminated.push(userId);
      }
      
      results.playerResults[userId] = {
        correct: isCorrect,
        responseTime: timeDiff,
        reason: isCorrect ? 'correct' : 'wrong',
        answer: answer,
        eliminated: !isCorrect
      };
    }
  }

  return results;
}

/**
 * Process game state calculations
 * @param {Object} gameState - Current game state
 * @param {Object} answerResults - Answer evaluation results
 * @returns {Object} Updated game state
 */
function processGameState(gameState, answerResults) {
  const updatedState = { ...gameState };
  
  // Update player statuses
  updatedState.players = gameState.players.map(player => {
    const result = answerResults.playerResults[player.user.id];
    if (result) {
      return {
        ...player,
        status: result.eliminated ? 'eliminated' : 'alive',
        eliminatedAt: result.eliminated ? new Date() : player.eliminatedAt,
        eliminatedOnQuestion: result.eliminated ? gameState.currentQuestion + 1 : player.eliminatedOnQuestion,
        eliminationReason: result.eliminated ? result.reason : player.eliminationReason,
        lastAnswer: result.answer,
        lastAnswerTime: result.responseTime
      };
    }
    return player;
  });

  // Update game statistics
  updatedState.stats = {
    totalPlayers: gameState.players.length,
    survivors: answerResults.survivors.length,
    eliminated: answerResults.eliminated.length,
    correctAnswers: answerResults.correctAnswers,
    wrongAnswers: answerResults.wrongAnswers,
    lateAnswers: answerResults.lateAnswers
  };

  return updatedState;
}

/**
 * Calculate prize distribution
 * @param {Array} winners - Array of winner user IDs
 * @param {number} totalPrize - Total prize pool
 * @returns {Object} Prize distribution
 */
function calculatePrizeDistribution(winners, totalPrize) {
  const winnerCount = winners.length;
  const individualPrize = winnerCount > 0 ? totalPrize / winnerCount : 0;
  
  return {
    totalPrize,
    winnerCount,
    individualPrize: Math.round(individualPrize * 100) / 100, // Round to 2 decimal places
    distribution: winners.map(winnerId => ({
      userId: winnerId,
      prize: individualPrize
    }))
  };
}

// Handle messages from main thread
parentPort.on('message', ({ type, data }) => {
  try {
    let result;
    
    switch (type) {
      case 'process_answers':
        result = processAnswers(
          data.gameId,
          data.questionIndex,
          data.answers,
          data.correctAnswer,
          data.timeLimit
        );
        break;
        
      case 'process_game_state':
        result = processGameState(data.gameState, data.answerResults);
        break;
        
      case 'calculate_prizes':
        result = calculatePrizeDistribution(data.winners, data.totalPrize);
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
  console.error('Worker thread error:', error);
});

// Log worker startup
console.log(`Answer Processor Worker started (PID: ${process.pid})`);
