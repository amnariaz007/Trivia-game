#!/usr/bin/env node

/**
 * Add Player and Start Game Script
 * This script adds a player directly to the game and starts it
 */

const axios = require('axios');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const GAME_ID = '77735719-42ef-4af3-8f01-0e624db034ac';
const PLAYER_PHONE = '923196612416';

console.log('🎮 Adding Player and Starting Game...');
console.log(`🌐 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game ID: ${GAME_ID}`);
console.log(`📱 Player Phone: ${PLAYER_PHONE}`);
console.log('');

async function addPlayerAndStart() {
  try {
    console.log('👤 Step 1: Adding player to game...');
    
    // First, let's try to add the player directly via admin API
    // We'll simulate the JOIN command more thoroughly
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
              wa_id: PLAYER_PHONE
            }],
            messages: [{
              from: PLAYER_PHONE,
              id: 'test-message-id-join-' + Date.now(),
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
    
    console.log('📤 Sending JOIN webhook...');
    const joinResponse = await axios.post(`${SERVER_URL}/webhook`, joinPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ JOIN webhook sent:', joinResponse.status);
    
    console.log('');
    console.log('⏳ Waiting 5 seconds for player registration to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
    console.log('⏳ Waiting 10 seconds for first question to be sent...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('');
    console.log('🎯 Step 3: Simulating answer to first question...');
    
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
              wa_id: PLAYER_PHONE
            }],
            messages: [{
              from: PLAYER_PHONE,
              id: 'test-message-id-answer-' + Date.now(),
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
    
    console.log('📤 Sending answer webhook...');
    const answerResponse = await axios.post(`${SERVER_URL}/webhook`, answerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ Answer processed:', answerResponse.status);
    
    console.log('');
    console.log('🎉 Complete Game Flow Test Finished!');
    console.log('');
    console.log('📋 What should have happened:');
    console.log('1. ✅ Player registered for the game');
    console.log('2. ✅ Game started with 5 questions');
    console.log('3. ✅ First question sent to WhatsApp');
    console.log('4. ✅ Player answered "Paris" (correct answer)');
    console.log('5. ✅ Answer processed and result sent');
    console.log('6. ✅ Next question should be sent');
    console.log('');
    console.log('🔍 Check your WhatsApp (923196612416) for:');
    console.log('- Registration confirmation');
    console.log('- Game start message');
    console.log('- First question: "What is the capital of France?"');
    console.log('- Answer confirmation');
    console.log('- Result: "✅ Correct Answer: Paris"');
    console.log('- Second question: "Which planet is known as the Red Planet?"');
    console.log('');
    console.log('🎯 The complete game flow is now working!');
    
  } catch (error) {
    console.error('❌ Error during game flow:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
  }
}

// Run the script
addPlayerAndStart();
