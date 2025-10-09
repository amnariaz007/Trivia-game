/**
 * Scalability Test for QRush Trivia
 * Tests the game with 30-100 concurrent users
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'https://ingenious-abundance-production.up.railway.app';
const CONCURRENT_USERS = 20; // Test with 20 users
const TEST_DURATION = 300000; // 5 minutes

// Generate test users
const testUsers = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
  phone: `92300000000${i.toString().padStart(2, '0')}`,
  nickname: `TestUser${i + 1}`
}));

async function simulateUser(user, userIndex) {
  const startTime = Date.now();
  let messageCount = 0;
  let errors = 0;
  
  console.log(`👤 User ${userIndex + 1} (${user.phone}) starting simulation`);
  
  try {
    // Simulate user joining game with proper webhook format
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
              profile: { name: user.nickname }, 
              wa_id: user.phone 
            }],
            messages: [{
              from: user.phone,
              id: `test_${userIndex}_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: { body: 'JOIN' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    const joinResponse = await axios.post(`${BASE_URL}/webhook`, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp/2.0'
      },
      timeout: 10000
    });
    
    messageCount++;
    console.log(`✅ User ${userIndex + 1} joined successfully`);
    
    // Simulate answering questions (random answers)
    const answers = ['A', 'B', 'C', 'D'];
    
    for (let questionNum = 1; questionNum <= 5; questionNum++) {
      // Wait random time between 2-8 seconds
      await new Promise(resolve => setTimeout(resolve, Math.random() * 6000 + 2000));
      
      const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
      
      const answerPayload = {
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
                profile: { name: user.nickname }, 
                wa_id: user.phone 
              }],
              messages: [{
                from: user.phone,
                id: `test_${userIndex}_q${questionNum}_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                interactive: {
                  type: 'button_reply',
                  button_reply: { 
                    id: `btn_${Math.floor(Math.random() * 3) + 1}`, 
                    title: randomAnswer 
                  }
                },
                type: 'interactive'
              }]
            },
            field: 'messages'
          }]
        }]
      };
      
      const answerResponse = await axios.post(`${BASE_URL}/webhook`, answerPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp/2.0'
        },
        timeout: 10000
      });
      
      messageCount++;
      console.log(`📝 User ${userIndex + 1} answered Q${questionNum}: ${randomAnswer}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ User ${userIndex + 1} completed simulation in ${duration}ms (${messageCount} messages, ${errors} errors)`);
    
    return {
      userIndex: userIndex + 1,
      duration,
      messageCount,
      errors,
      success: true
    };
    
  } catch (error) {
    errors++;
    console.error(`❌ User ${userIndex + 1} error:`, error.message);
    
    return {
      userIndex: userIndex + 1,
      duration: Date.now() - startTime,
      messageCount,
      errors,
      success: false,
      error: error.message
    };
  }
}

async function runScalabilityTest() {
  console.log(`🚀 Starting scalability test with ${CONCURRENT_USERS} users`);
  console.log(`⏰ Test duration: ${TEST_DURATION / 1000} seconds`);
  console.log(`🌐 Target URL: ${BASE_URL}`);
  
  const startTime = Date.now();
  const results = [];
  
  // Start all users simultaneously
  const userPromises = testUsers.map((user, index) => 
    simulateUser(user, index)
  );
  
  console.log(`👥 Started ${CONCURRENT_USERS} concurrent user simulations`);
  
  // Wait for all users to complete or timeout
  try {
    const userResults = await Promise.allSettled(userPromises);
    
    userResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          userIndex: index + 1,
          duration: 0,
          messageCount: 0,
          errors: 1,
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  // Calculate statistics
  const successfulUsers = results.filter(r => r.success).length;
  const failedUsers = results.filter(r => !r.success).length;
  const totalMessages = results.reduce((sum, r) => sum + r.messageCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('\n📊 SCALABILITY TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`👥 Total Users: ${CONCURRENT_USERS}`);
  console.log(`✅ Successful: ${successfulUsers}`);
  console.log(`❌ Failed: ${failedUsers}`);
  console.log(`📤 Total Messages: ${totalMessages}`);
  console.log(`⚠️  Total Errors: ${totalErrors}`);
  console.log(`⏱️  Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`🕐 Total Test Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`📈 Success Rate: ${Math.round((successfulUsers / CONCURRENT_USERS) * 100)}%`);
  console.log(`📊 Messages/Second: ${Math.round(totalMessages / (totalDuration / 1000))}`);
  
  // Performance thresholds
  const successRate = (successfulUsers / CONCURRENT_USERS) * 100;
  const messagesPerSecond = totalMessages / (totalDuration / 1000);
  
  console.log('\n🎯 PERFORMANCE ANALYSIS:');
  console.log('='.repeat(50));
  
  if (successRate >= 95) {
    console.log('✅ SUCCESS RATE: EXCELLENT (≥95%)');
  } else if (successRate >= 90) {
    console.log('⚠️  SUCCESS RATE: GOOD (≥90%)');
  } else {
    console.log('❌ SUCCESS RATE: NEEDS IMPROVEMENT (<90%)');
  }
  
  if (messagesPerSecond >= 10) {
    console.log('✅ THROUGHPUT: EXCELLENT (≥10 msg/s)');
  } else if (messagesPerSecond >= 5) {
    console.log('⚠️  THROUGHPUT: GOOD (≥5 msg/s)');
  } else {
    console.log('❌ THROUGHPUT: NEEDS IMPROVEMENT (<5 msg/s)');
  }
  
  if (avgResponseTime <= 2000) {
    console.log('✅ RESPONSE TIME: EXCELLENT (≤2s)');
  } else if (avgResponseTime <= 5000) {
    console.log('⚠️  RESPONSE TIME: ACCEPTABLE (≤5s)');
  } else {
    console.log('❌ RESPONSE TIME: NEEDS IMPROVEMENT (>5s)');
  }
  
  console.log('\n🔍 DETAILED RESULTS:');
  console.log('='.repeat(50));
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} User ${result.userIndex}: ${result.duration}ms, ${result.messageCount} msgs, ${result.errors} errors`);
  });
  
  return {
    totalUsers: CONCURRENT_USERS,
    successfulUsers,
    failedUsers,
    successRate,
    totalMessages,
    messagesPerSecond,
    avgResponseTime,
    totalDuration,
    results
  };
}

// Run the test
if (require.main === module) {
  runScalabilityTest()
    .then(results => {
      console.log('\n🎉 Scalability test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runScalabilityTest, simulateUser, testUsers };
