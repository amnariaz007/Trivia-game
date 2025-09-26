#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
const testNumber = '923196612416';

async function postmanTestGuide() {
  console.log('📮 Postman WhatsApp API Test Guide');
  console.log('==================================\n');

  console.log('🔧 Step 1: Check Your Current Configuration');
  console.log('===========================================');
  console.log(`Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`Phone Number ID: ${phoneNumberId}`);
  console.log(`API Version: ${apiVersion}`);
  console.log(`Test Number: ${testNumber} (03196612416)\n`);

  console.log('📮 Step 2: Postman Configuration');
  console.log('===============================');
  console.log('Method: POST');
  console.log(`URL: https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`);
  console.log('\nHeaders:');
  console.log('  Authorization: Bearer ' + (accessToken ? accessToken.substring(0, 20) + '...' : 'YOUR_TOKEN_HERE'));
  console.log('  Content-Type: application/json');
  console.log('\nBody (raw JSON):');
  console.log(JSON.stringify({
    "messaging_product": "whatsapp",
    "to": testNumber,
    "type": "text",
    "text": {
      "body": "🧪 Test message from Postman"
    }
  }, null, 2));

  console.log('\n🔍 Step 3: Test Your Current Token');
  console.log('==================================');
  
  if (!accessToken) {
    console.log('❌ No access token found in .env file');
    console.log('   Please add WHATSAPP_ACCESS_TOKEN to your .env file');
    return;
  }

  try {
    // Test the token first
    console.log('Testing access token...');
    const tokenTest = await axios.get(`https://graph.facebook.com/${apiVersion}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Access token is valid');
    console.log(`   App: ${tokenTest.data.name}`);
    console.log(`   App ID: ${tokenTest.data.id}\n`);

    // Test the phone number ID
    console.log('Testing phone number ID...');
    const phoneTest = await axios.get(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Phone number ID is accessible');
    console.log(`   Display Name: ${phoneTest.data.display_phone_number}`);
    console.log(`   Status: ${phoneTest.data.status || 'Unknown'}\n`);

    // Test sending a message
    console.log('Testing message sending...');
    const messageTest = await axios.post(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: testNumber,
      type: 'text',
      text: {
        body: '🧪 Test message from Node.js script'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Message sent successfully!');
    console.log(`   Message ID: ${messageTest.data.messages[0].id}`);
    console.log(`   Recipient: ${messageTest.data.contacts[0].wa_id}`);
    console.log('\n🎉 Your configuration is working! You can now test in Postman.\n');

  } catch (error) {
    console.log('❌ Error testing configuration:');
    
    if (error.response?.data?.error?.code === 10) {
      console.log('   Error: Application does not have permission for this action');
      console.log('   Solution: Generate a new access token with proper permissions');
      console.log('   1. Go to: https://developers.facebook.com/apps/');
      console.log('   2. Select your app → WhatsApp → Configuration → Access Tokens');
      console.log('   3. Generate new token with WhatsApp Business permissions\n');
    } else if (error.response?.data?.error?.code === 131030) {
      console.log('   Error: Recipient phone number not in allowed list');
      console.log('   Solution: Add test number to allowed list');
      console.log('   1. Go to: https://developers.facebook.com/apps/');
      console.log('   2. Select your app → WhatsApp → Configuration → Test Numbers');
      console.log('   3. Add: 03196612416\n');
    } else {
      console.log('   Error:', error.response?.data || error.message);
    }
  }

  console.log('📮 Step 4: Postman Troubleshooting');
  console.log('==================================');
  console.log('If Postman still doesn\'t work:');
  console.log('1. ✅ Check the URL is exactly: https://graph.facebook.com/v18.0/701372516403172/messages');
  console.log('2. ✅ Check the method is POST');
  console.log('3. ✅ Check Authorization header: Bearer YOUR_TOKEN');
  console.log('4. ✅ Check Content-Type header: application/json');
  console.log('5. ✅ Check the body is valid JSON');
  console.log('6. ✅ Make sure you\'re using the correct access token');
  console.log('7. ✅ Ensure the test number is in your allowed list');

  console.log('\n🔧 Step 5: Alternative Testing Methods');
  console.log('=====================================');
  console.log('If Postman doesn\'t work, try:');
  console.log('1. curl command:');
  console.log(`   curl -X POST "https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages" \\`);
  console.log(`     -H "Authorization: Bearer ${accessToken ? accessToken.substring(0, 20) + '...' : 'YOUR_TOKEN'}" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"messaging_product":"whatsapp","to":"${testNumber}","type":"text","text":{"body":"Test message"}}'`);
  
  console.log('\n2. Run our test script:');
  console.log('   node scripts/test-messaging-api.js');

  console.log('\n3. Check webhook logs:');
  console.log('   Your webhook is active at: https://ca18372437de.ngrok-free.app/webhook');
}

postmanTestGuide().catch(console.error);

