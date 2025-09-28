#!/usr/bin/env node

/**
 * Create Game Direct Script
 * This script creates a game directly using the gameService
 */

console.log('🎮 Creating Game Directly...');

// Test questions
const testQuestions = [
  {
    question_text: "What is the capital of France?",
    option_a: "London",
    option_b: "Paris",
    option_c: "Berlin",
    option_d: "Madrid",
    correct_answer: "Paris"
  },
  {
    question_text: "Which planet is known as the Red Planet?",
    option_a: "Venus",
    option_b: "Mars",
    option_c: "Jupiter",
    option_d: "Saturn",
    correct_answer: "Mars"
  },
  {
    question_text: "What is 2 + 2?",
    option_a: "3",
    option_b: "4",
    option_c: "5",
    option_d: "6",
    correct_answer: "4"
  }
];

async function createGameDirect() {
  try {
    console.log('📦 Loading models...');
    
    // Set up minimal environment for testing
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'; // Dummy URL
    
    const { Game, Question } = require('./models');
    const gameService = require('./services/gameService');
    
    console.log('✅ Models loaded successfully');
    
    console.log('');
    console.log('🎮 Creating game...');
    
    // Create game
    const game = await Game.create({
      start_time: new Date(Date.now() + 60000), // 1 minute from now
      prize_pool: 100,
      status: 'scheduled',
      total_questions: testQuestions.length
    });
    
    console.log('✅ Game created:', game.id);
    
    console.log('');
    console.log('❓ Adding questions...');
    
    // Add questions
    for (let i = 0; i < testQuestions.length; i++) {
      const question = await Question.create({
        game_id: game.id,
        question_text: testQuestions[i].question_text,
        option_a: testQuestions[i].option_a,
        option_b: testQuestions[i].option_b,
        option_c: testQuestions[i].option_c,
        option_d: testQuestions[i].option_d,
        correct_answer: testQuestions[i].correct_answer,
        question_order: i + 1
      });
      
      console.log(`✅ Question ${i + 1} added: ${question.question_text}`);
    }
    
    console.log('');
    console.log('🎉 Game created successfully!');
    console.log('🎮 Game ID:', game.id);
    console.log('⏰ Start time:', game.start_time);
    console.log('💰 Prize pool:', game.prize_pool);
    console.log('❓ Questions:', testQuestions.length);
    
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your admin interface');
    console.log('2. Find the game with ID:', game.id);
    console.log('3. Click "Start Registration"');
    console.log('4. Click "Start Game"');
    console.log('5. Send "JOIN" to your WhatsApp bot');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('database') || error.message.includes('connection')) {
      console.log('');
      console.log('💡 Database connection issue. Please use the admin interface instead:');
      console.log('🌐 Go to: https://ingenious-abundance-production.up.railway.app/admin.html');
    }
  }
}

// Run the script
createGameDirect();
