/**
 * Basic Connectivity Test for QRush Trivia
 * Tests if the server is responding correctly
 */

const axios = require('axios');

const BASE_URL = 'https://ingenious-abundance-production.up.railway.app';

async function testConnectivity() {
  console.log('🔍 Testing server connectivity...');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data}`);
    
    // Test 2: Admin endpoint
    console.log('2️⃣ Testing admin endpoint...');
    const adminResponse = await axios.get(`${BASE_URL}/admin/games`, {
      headers: {
        'username': 'admin',
        'password': 'admin123'
      },
      timeout: 5000
    });
    console.log(`✅ Admin endpoint: ${adminResponse.status} - Found ${adminResponse.data.length} games`);
    
    // Test 3: Webhook endpoint (simple test)
    console.log('3️⃣ Testing webhook endpoint...');
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { 
              display_phone_number: '1234567890', 
              phone_number_id: 'test' 
            },
            contacts: [{ 
              profile: { name: 'TestUser' }, 
              wa_id: '923000000000' 
            }],
            messages: [{
              from: '923000000000',
              id: `test_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: { body: 'HELLO' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    const webhookResponse = await axios.post(`${BASE_URL}/webhook`, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp/2.0'
      },
      timeout: 10000
    });
    console.log(`✅ Webhook endpoint: ${webhookResponse.status}`);
    
    console.log('\n🎉 All connectivity tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
if (require.main === module) {
  testConnectivity()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testConnectivity };
