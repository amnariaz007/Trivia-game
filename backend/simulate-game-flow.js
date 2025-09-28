#!/usr/bin/env node

/**
 * Simulate Game Flow Script
 * This script simulates the complete game flow for testing
 */

const axios = require('axios');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const TEST_PHONE = '923196612416';

console.log('🎮 Simulating Game Flow for WhatsApp Trivia...');
console.log(`📱 Target Phone: ${TEST_PHONE}`);
console.log(`🌐 Server URL: ${SERVER_URL}`);
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
          id: 'test-message-id-1',
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
          id: 'test-message-id-2',
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

async function testGameFlow() {
  try {
    console.log('🚀 Step 1: Testing server connectivity...');
    try {
      const healthCheck = await axios.get(SERVER_URL);
      console.log('✅ Server is responding');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Server is responding (404 on root is expected)');
      } else {
        throw error;
      }
    }
    
    console.log('');
    console.log('📝 Step 2: Simulating JOIN command...');
    console.log('📤 Sending JOIN webhook payload...');
    
    const joinResponse = await axios.post(`${SERVER_URL}/webhook`, joinPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ JOIN command processed:', joinResponse.status);
    console.log('📊 Response:', joinResponse.data);
    
    console.log('');
    console.log('⏳ Waiting 3 seconds before sending answer...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('');
    console.log('🎯 Step 3: Simulating answer submission...');
    console.log('📤 Sending answer webhook payload...');
    
    const answerResponse = await axios.post(`${SERVER_URL}/webhook`, answerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalua'
      }
    });
    
    console.log('✅ Answer processed:', answerResponse.status);
    console.log('📊 Response:', answerResponse.data);
    
    console.log('');
    console.log('🎉 Game flow simulation completed!');
    console.log('');
    console.log('📋 What should happen:');
    console.log('1. ✅ JOIN command processed');
    console.log('2. 📱 You should receive a registration confirmation');
    console.log('3. 🎮 If a game is active, you should receive questions');
    console.log('4. 🎯 Your answer should be processed');
    console.log('5. 📊 You should receive result feedback');
    console.log('');
    console.log('🔍 Check your WhatsApp for messages!');
    
  } catch (error) {
    console.error('❌ Error during game flow simulation:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
  }
}

// Run the simulation
testGameFlow();
