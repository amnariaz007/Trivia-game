#!/usr/bin/env node

/**
 * Start Test Game Script
 * This script starts the game that was created and tests the flow
 */

const axios = require('axios');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const GAME_ID = '77735719-42ef-4af3-8f01-0e624db034ac'; // The game ID from the previous creation

console.log('🎮 Starting Test Game...');
console.log(`🌐 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game ID: ${GAME_ID}`);
console.log('');

async function startTestGame() {
  try {
    console.log('🚀 Step 1: Starting game registration...');
    
    const registerResponse = await axios.post(`${SERVER_URL}/admin/games/${GAME_ID}/register`, {}, {
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
    console.log('🚀 Step 2: Starting the game...');
    
    const startResponse = await axios.post(`${SERVER_URL}/admin/games/${GAME_ID}/start`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    console.log('✅ Game started successfully!');
    console.log('🎮 Game is now in progress!');
    
    console.log('');
    console.log('🎉 Test Game Started!');
    console.log('');
    console.log('📋 What happens next:');
    console.log('1. ✅ Game registration started');
    console.log('2. ✅ Game started (even without questions, it will show the flow)');
    console.log('3. 📱 Send "JOIN" to your WhatsApp bot');
    console.log('4. 🎯 You should receive game messages');
    console.log('');
    console.log('🔍 Check your WhatsApp for:');
    console.log('- Game announcement');
    console.log('- Registration confirmation');
    console.log('- Game start message');
    console.log('- Any error messages about missing questions');
    
  } catch (error) {
    console.error('❌ Error starting test game:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
  }
}

// Run the script
startTestGame();
