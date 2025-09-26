#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function checkWhatsAppConfig() {
  console.log('🔍 Checking WhatsApp Configuration...\n');
  
  // Check environment variables
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
  
  console.log('📋 Environment Variables:');
  console.log(`   Access Token: ${accessToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Phone Number ID: ${phoneNumberId || '❌ Missing'}`);
  console.log(`   Verify Token: ${verifyToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Version: ${apiVersion}\n`);
  
  if (!accessToken || !phoneNumberId) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  try {
    // Test the phone number ID
    console.log('🧪 Testing Phone Number ID...');
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Phone Number ID is valid!');
    console.log('📱 Phone Number Details:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Display Name: ${response.data.display_phone_number}`);
    console.log(`   Quality Rating: ${response.data.quality_rating || 'N/A'}`);
    console.log(`   Status: ${response.data.code_verification_status || 'N/A'}\n`);
    
    // Test sending a message (dry run)
    console.log('🧪 Testing Message API...');
    const testResponse = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: '1234567890', // Test number
        type: 'text',
        text: { body: 'Test message' }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on error
      }
    );
    
    if (testResponse.status === 200) {
      console.log('✅ Message API is working!');
    } else if (testResponse.status === 400 && testResponse.data.error?.code === 100) {
      console.log('⚠️  Message API access confirmed (test number invalid, but API works)');
    } else {
      console.log('❌ Message API error:', testResponse.data);
    }
    
  } catch (error) {
    console.log('❌ Configuration Error:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

checkWhatsAppConfig().catch(console.error);



