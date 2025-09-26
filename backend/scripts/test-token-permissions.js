#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testTokenPermissions() {
  console.log('🔍 Testing WhatsApp Access Token Permissions...\n');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No access token found in environment variables');
    return;
  }
  
  try {
    // Test the access token by getting user info
    console.log('🧪 Testing access token...');
    
    const response = await axios.get(
      'https://graph.facebook.com/v18.0/me',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Access token is valid!');
    console.log('👤 User info:', JSON.stringify(response.data, null, 2));
    
    // Try to get business accounts
    console.log('\n🏢 Fetching business accounts...');
    
    const businessResponse = await axios.get(
      'https://graph.facebook.com/v18.0/me/businesses',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Business accounts found:');
    console.log(JSON.stringify(businessResponse.data, null, 2));
    
    if (businessResponse.data.data && businessResponse.data.data.length > 0) {
      console.log('\n📋 Available Business Accounts:');
      businessResponse.data.data.forEach((business, index) => {
        console.log(`${index + 1}. ID: ${business.id}`);
        console.log(`   Name: ${business.name || 'N/A'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.code === 190) {
      console.log('\n💡 This looks like an expired or invalid access token.');
      console.log('   You may need to generate a new access token.');
    }
  }
}

testTokenPermissions().catch(console.error);



