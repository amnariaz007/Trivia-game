#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

async function checkTokenPermissions() {
  console.log('🔍 WhatsApp Access Token Permissions Check');
  console.log('==========================================\n');

  if (!accessToken) {
    console.error('❌ WHATSAPP_ACCESS_TOKEN not found in .env file');
    return;
  }

  try {
    // Check token info and permissions
    console.log('🔍 Checking token permissions...');
    const tokenInfoResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        fields: 'id,name,permissions'
      }
    });

    console.log('✅ Token is valid');
    console.log(`   App ID: ${tokenInfoResponse.data.id}`);
    console.log(`   App Name: ${tokenInfoResponse.data.name}\n`);

    // Check permissions
    const permissionsResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me/permissions`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('📋 Current Permissions:');
    const grantedPermissions = permissionsResponse.data.data.filter(p => p.status === 'granted');
    const declinedPermissions = permissionsResponse.data.data.filter(p => p.status === 'declined');

    if (grantedPermissions.length > 0) {
      console.log('✅ Granted Permissions:');
      grantedPermissions.forEach(perm => {
        console.log(`   - ${perm.permission}`);
      });
    }

    if (declinedPermissions.length > 0) {
      console.log('\n❌ Declined Permissions:');
      declinedPermissions.forEach(perm => {
        console.log(`   - ${perm.permission}`);
      });
    }

    // Check for required WhatsApp permissions
    const requiredPermissions = [
      'whatsapp_business_messaging',
      'whatsapp_business_management',
      'business_management'
    ];

    console.log('\n🔍 Required WhatsApp Permissions:');
    const missingPermissions = [];
    requiredPermissions.forEach(perm => {
      const hasPermission = grantedPermissions.some(p => p.permission === perm);
      if (hasPermission) {
        console.log(`   ✅ ${perm}`);
      } else {
        console.log(`   ❌ ${perm} - MISSING`);
        missingPermissions.push(perm);
      }
    });

    if (missingPermissions.length > 0) {
      console.log('\n🔧 Missing Permissions Fix:');
      console.log('============================');
      console.log('1. Go to: https://developers.facebook.com/apps/');
      console.log('2. Select your app: "Osama Tabasher Malhi"');
      console.log('3. Go to: App Review → Permissions and Features');
      console.log('4. Request these permissions:');
      missingPermissions.forEach(perm => {
        console.log(`   - ${perm}`);
      });
      console.log('\n5. Or generate a new token with proper permissions:');
      console.log('   - Go to: WhatsApp → Configuration → Access Tokens');
      console.log('   - Generate new token with WhatsApp Business permissions');
    }

    // Try to get WhatsApp Business Account directly
    console.log('\n🔍 Testing WhatsApp Business Account Access...');
    try {
      const wabaResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me/businesses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ Can access WhatsApp Business Account');
      console.log(`   Found ${wabaResponse.data.data.length} business accounts`);
    } catch (error) {
      console.log('❌ Cannot access WhatsApp Business Account');
      console.log('   Error:', error.response?.data?.error?.message);
      console.log('\n🔧 Solution:');
      console.log('   Your token needs "business_management" permission');
      console.log('   Generate a new token with proper permissions');
    }

    // Test the phone number ID directly
    console.log('\n🔍 Testing Phone Number ID Access...');
    try {
      const phoneResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/701372516403172`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ Phone Number ID is accessible');
      console.log(`   Display Name: ${phoneResponse.data.display_phone_number}`);
      console.log(`   Status: ${phoneResponse.data.status}`);
    } catch (error) {
      console.log('❌ Cannot access Phone Number ID');
      console.log('   Error:', error.response?.data?.error?.message);
      console.log('\n🔧 Possible Solutions:');
      console.log('   1. Phone Number ID is incorrect');
      console.log('   2. Token lacks WhatsApp Business permissions');
      console.log('   3. Phone number not associated with your app');
    }

  } catch (error) {
    console.error('❌ Error checking token:', error.response?.data || error.message);
  }
}

checkTokenPermissions().catch(console.error);

