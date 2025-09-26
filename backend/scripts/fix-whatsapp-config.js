#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

async function fixWhatsAppConfig() {
  console.log('🔧 WhatsApp Configuration Fix Tool');
  console.log('==================================\n');

  if (!accessToken) {
    console.error('❌ WHATSAPP_ACCESS_TOKEN not found in .env file');
    return;
  }

  console.log('📋 Current Configuration:');
  console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
  console.log(`   Phone Number ID: ${phoneNumberId}`);
  console.log(`   API Version: ${apiVersion}\n`);

  try {
    // Step 1: Test the access token
    console.log('🔍 Step 1: Testing Access Token...');
    const meResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Access Token is valid');
    console.log(`   App ID: ${meResponse.data.id}`);
    console.log(`   App Name: ${meResponse.data.name}\n`);

    // Step 2: Get WhatsApp Business Account
    console.log('🔍 Step 2: Finding WhatsApp Business Account...');
    const wabaResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me/businesses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (wabaResponse.data.data.length === 0) {
      console.log('❌ No WhatsApp Business Account found');
      console.log('   You need to create a WhatsApp Business Account first');
      return;
    }

    const businessAccount = wabaResponse.data.data[0];
    console.log('✅ WhatsApp Business Account found');
    console.log(`   Business Account ID: ${businessAccount.id}`);
    console.log(`   Business Account Name: ${businessAccount.name}\n`);

    // Step 3: Get phone numbers for this business account
    console.log('🔍 Step 3: Getting Phone Numbers...');
    const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/${businessAccount.id}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (phoneNumbersResponse.data.data.length === 0) {
      console.log('❌ No phone numbers found for this business account');
      console.log('   You need to add a phone number to your WhatsApp Business Account');
      return;
    }

    console.log('✅ Phone Numbers found:');
    phoneNumbersResponse.data.data.forEach((phone, index) => {
      console.log(`   ${index + 1}. ID: ${phone.id}`);
      console.log(`      Display Name: ${phone.display_phone_number}`);
      console.log(`      Status: ${phone.status}`);
      console.log(`      Quality Rating: ${phone.quality_rating}`);
      console.log(`      Verified: ${phone.verified_name ? 'YES' : 'NO'}`);
      console.log('');
    });

    // Step 4: Check if the configured phone number ID exists
    const configuredPhone = phoneNumbersResponse.data.data.find(phone => phone.id === phoneNumberId);
    if (!configuredPhone) {
      console.log('❌ Configured Phone Number ID not found in your business account');
      console.log('   Please update your .env file with one of the phone number IDs above');
      return;
    }

    console.log('✅ Configured Phone Number ID found');
    console.log(`   Display Name: ${configuredPhone.display_phone_number}`);
    console.log(`   Status: ${configuredPhone.status}`);
    console.log(`   Quality Rating: ${configuredPhone.quality_rating}`);
    console.log(`   Verified: ${configuredPhone.verified_name ? 'YES' : 'NO'}\n`);

    // Step 5: Test sending a message
    console.log('🔍 Step 5: Testing Message API...');
    try {
      const testMessageResponse = await axios.post(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: '923196612416',
        type: 'text',
        text: { body: 'Test message from QRush Trivia' }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Message sent successfully');
      console.log(`   Message ID: ${testMessageResponse.data.messages[0].id}`);
    } catch (error) {
      if (error.response?.data?.error?.code === 131030) {
        console.log('❌ Message failed: Recipient phone number not in allowed list');
        console.log('   You need to add 923196612416 to your test numbers list');
        console.log('   Go to: https://developers.facebook.com/apps/');
        console.log('   Select your app → WhatsApp → Configuration → Test Numbers');
        console.log('   Add: 03196612416');
      } else {
        console.log('❌ Message failed:', error.response?.data || error.message);
      }
    }

    // Step 6: Provide next steps
    console.log('\n📋 Next Steps:');
    console.log('==============');
    
    if (configuredPhone.status !== 'CONNECTED') {
      console.log('1. 🔗 Connect your phone number:');
      console.log('   - Go to WhatsApp Business Manager');
      console.log('   - Complete phone number verification');
      console.log('   - Ensure status shows "CONNECTED"');
    }

    if (!configuredPhone.verified_name) {
      console.log('2. ✅ Verify your business name:');
      console.log('   - Go to WhatsApp Business Manager');
      console.log('   - Submit business verification');
      console.log('   - Wait for approval');
    }

    console.log('3. 📱 Add test number to allowed list:');
    console.log('   - Go to: https://developers.facebook.com/apps/');
    console.log('   - Select your app → WhatsApp → Configuration');
    console.log('   - Add test number: 03196612416');
    console.log('   - This allows you to send messages to this number');

    console.log('4. 🔄 Update your .env file if needed:');
    console.log(`   WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId}`);
    console.log(`   WHATSAPP_ACCESS_TOKEN=${accessToken}`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.code === 190) {
      console.log('\n🔧 Access Token Issue:');
      console.log('   Your access token may be expired or invalid');
      console.log('   Generate a new token at: https://developers.facebook.com/apps/');
      console.log('   Select your app → WhatsApp → Configuration → Access Tokens');
    }
  }
}

fixWhatsAppConfig().catch(console.error);

