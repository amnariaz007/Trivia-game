/**
 * Message Processor Worker Thread
 * Handles CPU-intensive message processing and formatting
 * Runs in separate thread to avoid blocking main event loop
 */

const { parentPort, workerData } = require('worker_threads');

/**
 * Process and format messages for batch sending
 * @param {Array} messages - Array of message objects
 * @returns {Object} Processed message batches
 */
function processMessageBatch(messages) {
  const batches = {
    high: [],
    normal: [],
    low: [],
    combined: []
  };
  
  // Sort messages by priority
  messages.forEach(message => {
    const priority = message.priority || 'normal';
    batches[priority].push(message);
  });
  
  // Process each priority batch
  Object.keys(batches).forEach(priority => {
    if (batches[priority].length > 0) {
      batches[priority] = batches[priority].map(msg => ({
        ...msg,
        processed: true,
        timestamp: Date.now(),
        formatted: formatMessage(msg)
      }));
    }
  });
  
  // Create combined batch for efficiency
  batches.combined = [
    ...batches.high,
    ...batches.normal,
    ...batches.low
  ];
  
  return batches;
}

/**
 * Format individual message
 * @param {Object} message - Message object
 * @returns {Object} Formatted message
 */
function formatMessage(message) {
  const formatted = { ...message };
  
  // Add formatting based on message type
  switch (message.type) {
    case 'question':
      formatted.formattedText = formatQuestionMessage(message);
      break;
    case 'elimination':
      formatted.formattedText = formatEliminationMessage(message);
      break;
    case 'countdown':
      formatted.formattedText = formatCountdownMessage(message);
      break;
    case 'game_start':
      formatted.formattedText = formatGameStartMessage(message);
      break;
    case 'game_end':
      formatted.formattedText = formatGameEndMessage(message);
      break;
    default:
      formatted.formattedText = message.text || message.message;
  }
  
  // Add metadata
  formatted.metadata = {
    length: formatted.formattedText.length,
    type: message.type,
    priority: message.priority || 'normal',
    timestamp: Date.now()
  };
  
  return formatted;
}

/**
 * Format question message
 */
function formatQuestionMessage(message) {
  const { questionText, options, questionNumber, timeLeft } = message;
  
  let formatted = `Q${questionNumber}: ${questionText}\n\n`;
  
  if (options && Array.isArray(options)) {
    options.forEach((option, index) => {
      formatted += `${String.fromCharCode(65 + index)}. ${option}\n`;
    });
  }
  
  if (timeLeft) {
    formatted += `\n⏰ ${timeLeft} seconds left`;
  }
  
  return formatted;
}

/**
 * Format elimination message
 */
function formatEliminationMessage(message) {
  const { isCorrect, correctAnswer, questionNumber, responseTime } = message;
  
  if (isCorrect) {
    return `✅ Correct Answer: ${correctAnswer}\n\n🎉 You're still in!`;
  } else {
    return `❌ Correct Answer: ${correctAnswer}\n\n💀 You're out this game. Stick around to watch the finish!`;
  }
}

/**
 * Format countdown message
 */
function formatCountdownMessage(message) {
  const { secondsLeft } = message;
  return `⏰ ${secondsLeft} seconds left to answer!`;
}

/**
 * Format game start message
 */
function formatGameStartMessage(message) {
  const { prizePool, questionTimer } = message;
  return `🎮 QRush Trivia is starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 30 seconds...`;
}

/**
 * Format game end message
 */
function formatGameEndMessage(message) {
  const { winnerCount, prizePool, individualPrize } = message;
  
  if (winnerCount === 1) {
    return `🏆 Game over — we have a winner!\n\n💰 Prize: $${prizePool}\n\nWinner will be contacted directly for prize delivery.\n\nThanks for playing QRush Trivia!`;
  } else {
    return `🏆 Game over!\n\nMultiple winners this time — nice!\n👥 Winners: ${winnerCount}\n💰 Prize pool: $${prizePool}\n💵 Each winner receives: $${individualPrize}\n\nWinners will be DM'd directly for payout.`;
  }
}

/**
 * Group messages by recipient for efficient sending
 * @param {Array} messages - Array of messages
 * @returns {Map} Messages grouped by recipient
 */
function groupMessagesByRecipient(messages) {
  const grouped = new Map();
  
  messages.forEach(message => {
    const recipient = message.to || message.phoneNumber;
    if (!grouped.has(recipient)) {
      grouped.set(recipient, []);
    }
    grouped.get(recipient).push(message);
  });
  
  return grouped;
}

/**
 * Combine multiple messages for a single recipient
 * @param {Array} messages - Messages for a single recipient
 * @returns {string} Combined message text
 */
function combineMessages(messages) {
  // Sort by timestamp
  const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
  
  // Combine with separators
  return sortedMessages.map(msg => msg.formattedText || msg.text || msg.message).join('\n\n---\n\n');
}

/**
 * Validate message before sending
 * @param {Object} message - Message to validate
 * @returns {Object} Validation result
 */
function validateMessage(message) {
  const issues = [];
  
  if (!message.to && !message.phoneNumber) {
    issues.push('Missing recipient');
  }
  
  if (!message.text && !message.message && !message.formattedText) {
    issues.push('Missing message content');
  }
  
  const content = message.formattedText || message.text || message.message;
  if (content && content.length > 4096) {
    issues.push('Message too long (max 4096 characters)');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// Handle messages from main thread
parentPort.on('message', ({ type, data }) => {
  try {
    let result;
    
    switch (type) {
      case 'process_message_batch':
        result = processMessageBatch(data.messages);
        break;
        
      case 'format_message':
        result = formatMessage(data.message);
        break;
        
      case 'group_by_recipient':
        result = groupMessagesByRecipient(data.messages);
        break;
        
      case 'combine_messages':
        result = combineMessages(data.messages);
        break;
        
      case 'validate_message':
        result = validateMessage(data.message);
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
  console.error('Message Processor Worker error:', error);
});

// Log worker startup
console.log(`Message Processor Worker started (PID: ${process.pid})`);
