#!/usr/bin/env node

require('dotenv').config();
const WhatsAppService = require('../services/whatsappService');

async function testWhatsAppMessage() {
  console.log('🧪 Testing WhatsApp Message Sending...\n');
  
  const whatsappService = WhatsAppService;
  
  try {
    // Test sending a simple text message
    console.log('📤 Sending test text message...');
    const result = await whatsappService.sendTextMessage(
      '923196612416', // Your test number: 03196612416
      '🎉 WhatsApp configuration is working! This is a test message from QRush Trivia.'
    );
    
    console.log('✅ Message sent successfully!');
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Error sending message:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

testWhatsAppMessage().catch(console.error);
