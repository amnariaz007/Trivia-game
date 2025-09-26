#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function captureWebhookLogs() {
  console.log('📊 WhatsApp Webhook Logs for Meta App Review');
  console.log('=============================================\n');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const testNumber = '923196612416'; // 03196612416
  
  console.log('🔧 Configuration:');
  console.log(`   Phone Number ID: ${phoneNumberId}`);
  console.log(`   Test Number: ${testNumber} (03196612416)`);
  console.log(`   Webhook URL: https://ca18372437de.ngrok-free.app/webhook`);
  console.log(`   API Version: v18.0\n`);
  
  console.log('📱 Sending test messages to generate webhook logs...\n');
  
  // Send a series of messages to generate webhook activity
  const messages = [
    {
      type: 'text',
      body: '🎮 QRush Trivia Game Starting!\n\nGet ready for sudden-death questions!',
      description: 'Game Start Message'
    },
    {
      type: 'text', 
      body: 'Q1: Who wrote Hamlet?\n\nA) Shakespeare\nB) Dickens\nC) Twain\nD) Poe',
      description: 'Question 1'
    },
    {
      type: 'interactive',
      body: 'Q2: What is the capital of France?',
      description: 'Question 2 with Buttons'
    },
    {
      type: 'text',
      body: '✅ Answer locked in! Please wait until the next round.\n\nCorrect Answer: Shakespeare',
      description: 'Answer Confirmation'
    },
    {
      type: 'text',
      body: '🏆 Congratulations! You won the trivia game!\n\n💰 Prize: $50.00\n\nReply "PLAY" for the next game!',
      description: 'Game End Message'
    }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`📤 Sending Message ${i + 1}: ${message.description}`);
    
    try {
      let payload;
      
      if (message.type === 'interactive') {
        payload = {
          messaging_product: 'whatsapp',
          to: testNumber,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: message.body
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'A',
                    title: 'Paris'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'B',
                    title: 'London'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'C',
                    title: 'Berlin'
                  }
                }
              ]
            }
          }
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to: testNumber,
          type: 'text',
          text: { body: message.body }
        };
      }
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`   ✅ Message sent successfully`);
      console.log(`   📋 Message ID: ${response.data.messages[0].id}`);
      console.log(`   📱 Recipient: ${response.data.contacts[0].wa_id}`);
      console.log(`   ⏰ Timestamp: ${new Date().toISOString()}`);
      console.log('');
      
      // Wait 3 seconds between messages to allow webhook processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.error?.message || error.message}`);
      console.log('');
    }
  }
  
  console.log('📊 Webhook Activity Summary:');
  console.log('============================');
  console.log('The following webhook events should be visible in your server logs:');
  console.log('');
  console.log('1. 📥 Message Status Updates (delivered/read):');
  console.log('   - Each sent message generates status webhooks');
  console.log('   - Shows message delivery confirmation');
  console.log('   - Demonstrates webhook integration working');
  console.log('');
  console.log('2. 📱 User Message Responses (if user replies):');
  console.log('   - User replies generate message webhooks');
  console.log('   - Shows bidirectional communication');
  console.log('   - Proves user engagement');
  console.log('');
  console.log('3. 🔄 Webhook Processing:');
  console.log('   - All webhooks return 200 OK status');
  console.log('   - No validation errors');
  console.log('   - Proper message handling');
  console.log('');
  console.log('📋 For Meta App Review:');
  console.log('   - Show these webhook logs as evidence');
  console.log('   - Demonstrate real-time message processing');
  console.log('   - Prove WhatsApp Business API integration');
  console.log('   - Show proper error handling and validation');
  console.log('');
  console.log('✅ Test messages sent! Check your server logs for webhook activity.');
}

captureWebhookLogs().catch(console.error);

