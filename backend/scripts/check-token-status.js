const axios = require('axios');
require('dotenv').config();

async function checkTokenStatus() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!token) {
    console.log('❌ No WhatsApp access token found in .env');
    return;
  }
  
  console.log('🔍 Checking WhatsApp token status...');
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
  
  try {
    // Test the token by making a simple API call
    const response = await axios.get(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`, {
      params: {
        access_token: token,
        fields: 'display_phone_number,verified_name'
      }
    });
    
    console.log('✅ Token is VALID');
    console.log('📱 Phone number:', response.data.display_phone_number);
    console.log('🏢 Business name:', response.data.verified_name);
    
    // Check token expiration (if available)
    if (response.data.expires_in) {
      const expiresIn = response.data.expires_in;
      const hoursLeft = Math.floor(expiresIn / 3600);
      console.log(`⏰ Token expires in: ${hoursLeft} hours`);
      
      if (hoursLeft < 2) {
        console.log('⚠️  WARNING: Token expires soon! Get a new one from Meta for Developers.');
      }
    }
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Token is INVALID or EXPIRED');
      console.log('🔑 Get a new token from: https://developers.facebook.com/apps/');
    } else {
      console.log('❌ Error checking token:', error.response?.data || error.message);
    }
  }
}

checkTokenStatus();



