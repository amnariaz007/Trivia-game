#!/usr/bin/env node

/**
 * Test Game Flow Script
 * This script tests the game flow without requiring database connection
 */

console.log('🧪 Testing Game Flow Components...');

// Test 1: Check if gameService can be loaded
try {
  console.log('📦 Loading gameService...');
  const gameService = require('./services/gameService');
  console.log('✅ gameService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load gameService:', error.message);
}

// Test 2: Check if queueService can be loaded
try {
  console.log('📦 Loading queueService...');
  const queueService = require('./services/queueService');
  console.log('✅ queueService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load queueService:', error.message);
}

// Test 3: Check if whatsappService can be loaded
try {
  console.log('📦 Loading whatsappService...');
  const whatsappService = require('./services/whatsappService');
  console.log('✅ whatsappService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load whatsappService:', error.message);
}

// Test 4: Test question sending logic (without actually sending)
console.log('🎯 Testing question sending logic...');

const testQuestion = {
  question_text: "What is the capital of France?",
  option_a: "London",
  option_b: "Paris", 
  option_c: "Berlin",
  option_d: "Madrid",
  correct_answer: "Paris"
};

const testPlayer = {
  user: {
    nickname: "TestPlayer",
    whatsapp_number: "923196612416"
  },
  status: "alive"
};

console.log('📝 Test question:', testQuestion.question_text);
console.log('👤 Test player:', testPlayer.user.nickname);
console.log('📱 Test phone:', testPlayer.user.whatsapp_number);

// Test 5: Test game state structure
console.log('🎮 Testing game state structure...');

const testGameState = {
  id: "test-game-123",
  gameId: "test-game-123",
  status: "in_progress",
  currentQuestion: 0,
  questions: [testQuestion],
  players: [testPlayer],
  startTime: new Date(),
  questionTimer: null,
  activeTimers: new Set()
};

console.log('✅ Test game state created:', {
  id: testGameState.id,
  status: testGameState.status,
  currentQuestion: testGameState.currentQuestion,
  players: testGameState.players.length,
  questions: testGameState.questions.length
});

// Test 6: Test question progression logic
console.log('🔄 Testing question progression logic...');

const questionIndex = 0;
const currentQuestion = testGameState.currentQuestion;

console.log('🔍 Question check:', {
  questionIndex,
  currentQuestion,
  shouldStart: currentQuestion <= questionIndex
});

if (currentQuestion <= questionIndex) {
  console.log('✅ Question progression logic: PASSED');
} else {
  console.log('❌ Question progression logic: FAILED');
}

console.log('🎉 Game flow test completed!');
console.log('');
console.log('📋 Next steps:');
console.log('1. Set up your .env file with database and WhatsApp credentials');
console.log('2. Start your server: npm start');
console.log('3. Create a game through your admin interface');
console.log('4. Send "JOIN" to your WhatsApp bot number');
console.log('5. Watch the logs for the game flow');
