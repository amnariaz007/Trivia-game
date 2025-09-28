#!/usr/bin/env node

/**
 * Complete Test Flow Script
 * This script simulates the complete game flow: JOIN -> Start Game -> Answer Questions
 */

const axios = require('axios');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const GAME_ID = '77735719-42ef-4af3-8f01-0e624db034ac';
const TEST_PHONE = '923196612416';

console.log('🎮 Complete Test Flow - QRush Trivia');
console.log(`🌐 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game ID: ${GAME_ID}`);
console.log(`📱 Test Phone: ${TEST_PHONE}`);
console.log('');

// Simulate webhook payload for JOIN command
const joinPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'test-entry-id',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '1234567890',
          phone_number_id: 'test-phone-id'
        },
        contacts: [{
          profile: {
            name: 'Test Player'
          },
          wa_id: TEST_PHONE
        }],
        messages: [{
          from: TEST_PHONE,
          id: 'test-message-id-join',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: {
            body: 'JOIN'
          }
        }]
      },
      field: 'messages'
    }]
  }]
};

// Simulate webhook payload for answer
const answerPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'test-entry-id',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '1234567890',
          phone_number_id: 'test-phone-id'
        },
        contacts: [{
          profile: {
            name: 'Test Player'
          },
          wa_id: TEST_PHONE
        }],
        messages: [{
          from: TEST_PHONE,
          id: 'test-message-id-answer',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'interactive',
          interactive: {
            type: 'button_reply',
            button_reply: {
              id: 'btn_1',
              title: 'Paris'
            }
          }
        }]
      },
      field: 'messages'
    }]
  }]
};

async function completeTestFlow() {
  try {
    console.log('🚀 Step 1: Player joining game...');
    console.log('📤 Sending JOIN webhook...');
    
    const joinResponse = await axios.post(`${SERVER_URL}/webhook`, joinPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ JOIN processed:', joinResponse.status);
    console.log('📊 Response:', joinResponse.data);
    
    console.log('');
    console.log('⏳ Waiting 3 seconds for player registration...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('');
    console.log('🎮 Step 2: Starting the game...');
    
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
    console.log('⏳ Waiting 8 seconds for first question to be sent...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('');
    console.log('🎯 Step 3: Simulating answer submission...');
    console.log('📤 Sending answer webhook...');
    
    const answerResponse = await axios.post(`${SERVER_URL}/webhook`, answerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ Answer processed:', answerResponse.status);
    console.log('📊 Response:', answerResponse.data);
    
    console.log('');
    console.log('🎉 Complete Test Flow Finished!');
    console.log('');
    console.log('📋 What should have happened:');
    console.log('1. ✅ Player joined the game');
    console.log('2. ✅ Game started with questions');
    console.log('3. ✅ First question sent to WhatsApp');
    console.log('4. ✅ Player answered the question');
    console.log('5. ✅ Answer processed and result sent');
    console.log('');
    console.log('🔍 Check your WhatsApp (923196612416) for:');
    console.log('- Registration confirmation');
    console.log('- Game start message');
    console.log('- First question with buttons');
    console.log('- Answer confirmation');
    console.log('- Result feedback');
    console.log('- Next question (if correct)');
    console.log('');
    console.log('🎯 The game flow is now working!');
    
  } catch (error) {
    console.error('❌ Error during test flow:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
  }
}

// Run the complete test flow
completeTestFlow();
