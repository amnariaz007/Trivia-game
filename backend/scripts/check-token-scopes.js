#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function checkTokenScopes() {
  console.log('🔍 Checking Access Token Scopes and Permissions...\n');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No access token found in environment variables');
    return;
  }
  
  try {
    // Get token info including scopes
    console.log('🧪 Checking token information...');
    
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
    );
    
    console.log('✅ Token is valid!');
    console.log('👤 User:', response.data.name);
    console.log('🆔 User ID:', response.data.id);
    
    // Try to get token info with debug info
    console.log('\n🔍 Getting detailed token information...');
    
    const debugResponse = await axios.get(
      `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    
    console.log('📋 Token Debug Info:');
    console.log(JSON.stringify(debugResponse.data, null, 2));
    
    if (debugResponse.data.data) {
      const tokenData = debugResponse.data.data;
      console.log('\n📊 Token Analysis:');
      console.log(`   Valid: ${tokenData.is_valid ? '✅ Yes' : '❌ No'}`);
      console.log(`   App ID: ${tokenData.app_id}`);
      console.log(`   User ID: ${tokenData.user_id}`);
      console.log(`   Expires: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never'}`);
      
      if (tokenData.scopes) {
        console.log('\n🔑 Token Scopes:');
        tokenData.scopes.forEach(scope => {
          console.log(`   ✅ ${scope}`);
        });
        
        // Check for required scopes
        const requiredScopes = [
          'whatsapp_business_messaging',
          'whatsapp_business_management', 
          'business_management'
        ];
        
        console.log('\n🎯 Required Scopes Check:');
        requiredScopes.forEach(scope => {
          const hasScope = tokenData.scopes.includes(scope);
          console.log(`   ${hasScope ? '✅' : '❌'} ${scope}`);
        });
        
        const missingScopes = requiredScopes.filter(scope => !tokenData.scopes.includes(scope));
        if (missingScopes.length > 0) {
          console.log('\n⚠️  Missing Required Scopes:');
          missingScopes.forEach(scope => {
            console.log(`   ❌ ${scope}`);
          });
          console.log('\n💡 You need to generate a new token with these permissions.');
        } else {
          console.log('\n🎉 All required scopes are present!');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

checkTokenScopes().catch(console.error);



