const queueService = require('./services/queueService');

async function testRaceConditionFix() {
  console.log('🧪 Testing Race Condition Fix...');
  
  // Test 1: Basic lock acquisition
  console.log('\n1. Testing basic lock acquisition...');
  const lockKey = 'test:lock:1';
  
  const acquired1 = await queueService.acquireLock(lockKey, 5);
  console.log(`First lock attempt: ${acquired1 ? 'SUCCESS' : 'FAILED'}`);
  
  const acquired2 = await queueService.acquireLock(lockKey, 5);
  console.log(`Second lock attempt (should fail): ${acquired2 ? 'SUCCESS' : 'FAILED'}`);
  
  const isLocked = await queueService.isLocked(lockKey);
  console.log(`Lock status: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
  
  await queueService.releaseLock(lockKey);
  console.log('Lock released');
  
  const acquired3 = await queueService.acquireLock(lockKey, 5);
  console.log(`Third lock attempt (after release): ${acquired3 ? 'SUCCESS' : 'FAILED'}`);
  
  await queueService.releaseLock(lockKey);
  
  // Test 2: Simulate concurrent question processing
  console.log('\n2. Testing concurrent question processing...');
  const gameId = 'test-game-123';
  const questionIndex = 0;
  const lockKey2 = `question_results:${gameId}:${questionIndex}`;
  
  // Simulate 10 concurrent attempts to process the same question
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      queueService.acquireLock(lockKey2, 10).then(acquired => {
        console.log(`Attempt ${i + 1}: ${acquired ? 'ACQUIRED' : 'BLOCKED'}`);
        if (acquired) {
          // Simulate processing time
          return new Promise(resolve => {
            setTimeout(async () => {
              await queueService.releaseLock(lockKey2);
              resolve(true);
            }, 100);
          });
        }
        return false;
      })
    );
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r).length;
  console.log(`\nResults: ${successCount}/10 locks acquired (should be 1)`);
  
  console.log('\n✅ Race condition fix test completed!');
}

// Run the test
testRaceConditionFix().catch(console.error);
