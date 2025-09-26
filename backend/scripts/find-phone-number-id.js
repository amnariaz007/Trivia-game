#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function findPhoneNumberId() {
  console.log('🔍 Finding WhatsApp Phone Number ID...\n');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId = '633552152888554';
  
  if (!accessToken) {
    console.log('❌ No access token found in environment variables');
    return;
  }
  
  try {
    // Get phone numbers from the business account
    console.log(`📱 Fetching phone numbers for business account: ${businessAccountId}`);
    
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${businessAccountId}/phone_numbers`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Phone numbers found:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 Available Phone Numbers:');
      response.data.data.forEach((phone, index) => {
        console.log(`${index + 1}. Phone Number ID: ${phone.id}`);
        console.log(`   Display Name: ${phone.display_phone_number || 'N/A'}`);
        console.log(`   Status: ${phone.code_verification_status || 'N/A'}`);
        console.log(`   Quality Rating: ${phone.quality_rating || 'N/A'}`);
        console.log('');
      });
      
      // Test the first phone number
      const firstPhone = response.data.data[0];
      console.log(`🧪 Testing phone number: ${firstPhone.id}`);
      
      const testResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${firstPhone.id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: '923196612416', // Your test number: 03196612416
          type: 'text',
          text: { body: 'Test message from QRush Trivia' }
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
        console.log('✅ Phone number is working!');
        console.log('📱 Response:', JSON.stringify(testResponse.data, null, 2));
      } else if (testResponse.status === 400 && testResponse.data.error?.code === 131030) {
        console.log('⚠️  Phone number API access confirmed (test number not in allowed list, but API works)');
        console.log('📱 This means the phone number ID is correct!');
      } else {
        console.log('❌ Phone number test failed:', JSON.stringify(testResponse.data, null, 2));
      }
      
    } else {
      console.log('❌ No phone numbers found in this business account');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

findPhoneNumberId().catch(console.error);
