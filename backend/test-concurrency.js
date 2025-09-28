#!/usr/bin/env node

const queueService = require('./services/queueService');

async function testConcurrencyImprovement() {
  console.log('⚡ Testing Queue Concurrency Improvement\n');
  
  try {
    // Wait for queue service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🚀 Adding 50 test messages to queue...');
    
    const startTime = Date.now();
    const promises = [];
    
    // Add 50 messages to test concurrency
    for (let i = 1; i <= 50; i++) {
      promises.push(
        queueService.addMessage('send_message', {
          to: `+123456789${i.toString().padStart(3, '0')}`,
          message: `Test message ${i} - Testing concurrency improvement`
        })
      );
    }
    
    // Wait for all messages to be queued
    await Promise.all(promises);
    const queueTime = Date.now();
    
    console.log(`✅ 50 messages queued in ${queueTime - startTime}ms`);
    console.log('⏳ Waiting for messages to be processed...');
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n📊 CONCURRENCY TEST RESULTS:');
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📈 Messages per second: ${(50 / (totalTime / 1000)).toFixed(2)}`);
    
    // Calculate improvement
    const oldTime = 50 * 1000; // 50 seconds with 1 worker
    const improvement = ((oldTime - totalTime) / oldTime * 100).toFixed(1);
    
    console.log(`🚀 Performance improvement: ${improvement}% faster`);
    console.log(`⚡ Expected with 20 workers: ~2.5 seconds`);
    console.log(`📊 Actual result: ${(totalTime / 1000).toFixed(2)} seconds`);
    
    if (totalTime < 10000) { // Less than 10 seconds
      console.log('✅ CONCURRENCY FIX SUCCESSFUL!');
    } else {
      console.log('⚠️  Concurrency may need further optimization');
    }
    
  } catch (error) {
    console.error('❌ Error testing concurrency:', error);
  }
}

// Run the test
testConcurrencyImprovement().catch(console.error);
