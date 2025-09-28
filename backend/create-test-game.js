#!/usr/bin/env node

/**
 * Create Test Game Script
 * This script creates a complete test game with questions and starts it
 */

const axios = require('axios');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // Correct admin password

console.log('🎮 Creating Complete Test Game...');
console.log(`🌐 Server URL: ${SERVER_URL}`);
console.log('');

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
  },
  {
    question_text: "Which ocean is the largest?",
    option_a: "Atlantic",
    option_b: "Pacific",
    option_c: "Indian",
    option_d: "Arctic",
    correct_answer: "Pacific"
  },
  {
    question_text: "What is the chemical symbol for gold?",
    option_a: "Go",
    option_b: "Gd",
    option_c: "Au",
    option_d: "Ag",
    correct_answer: "Au"
  }
];

async function createTestGame() {
  try {
    console.log('🚀 Step 1: Creating new game...');
    
    // Set start time to 1 minute from now
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 1);
    
    const gameData = {
      startTime: startTime.toISOString().slice(0, 16), // Format for datetime-local input
      prizePool: 100,
      totalQuestions: testQuestions.length
    };
    
    console.log('📝 Game data:', gameData);
    
    const createResponse = await axios.post(`${SERVER_URL}/admin/games`, gameData, {
      headers: {
        'Content-Type': 'application/json',
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    const game = createResponse.data;
    console.log('✅ Game created successfully!');
    console.log('🎮 Game ID:', game.id);
    console.log('⏰ Start time:', game.start_time);
    console.log('💰 Prize pool:', game.prize_pool);
    
    console.log('');
    console.log('📝 Step 2: Adding questions to game...');
    
    const questionsResponse = await axios.post(`${SERVER_URL}/admin/games/${game.id}/questions`, {
      questions: testQuestions
    }, {
      headers: {
        'Content-Type': 'application/json',
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    console.log('✅ Questions added successfully!');
    console.log('❓ Questions count:', questionsResponse.data.length);
    
    console.log('');
    console.log('🎯 Step 3: Starting game registration...');
    
    const registerResponse = await axios.post(`${SERVER_URL}/admin/games/${game.id}/register`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    console.log('✅ Registration started!');
    console.log('📢 Announced to users:', registerResponse.data.userCount);
    
    console.log('');
    console.log('⏳ Waiting 2 seconds before starting the game...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('');
    console.log('🚀 Step 4: Starting the game...');
    
    const startResponse = await axios.post(`${SERVER_URL}/admin/games/${game.id}/start`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    console.log('✅ Game started successfully!');
    console.log('🎮 Game is now in progress!');
    
    console.log('');
    console.log('🎉 Test Game Setup Complete!');
    console.log('');
    console.log('📋 What happens next:');
    console.log('1. ✅ Game created with 5 questions');
    console.log('2. ✅ Registration started (users can JOIN)');
    console.log('3. ✅ Game started (questions will be sent)');
    console.log('4. 📱 Send "JOIN" to your WhatsApp bot');
    console.log('5. 🎯 Answer the questions as they come');
    console.log('');
    console.log('🔍 Check your WhatsApp for:');
    console.log('- Game announcement');
    console.log('- Registration confirmation');
    console.log('- Game start message');
    console.log('- Questions with buttons');
    console.log('- Answer confirmations');
    console.log('- Results and eliminations');
    
  } catch (error) {
    console.error('❌ Error creating test game:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
    
    if (error.response?.status === 401) {
      console.log('');
      console.log('🔐 Authentication Error:');
      console.log('Please update the ADMIN_PASSWORD in this script to match your server configuration.');
    }
  }
}

// Run the test game creation
createTestGame();
