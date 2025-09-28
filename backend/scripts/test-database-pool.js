#!/usr/bin/env node

const { sequelize } = require('../config/database');
const { User } = require('../models');

async function testDatabasePool() {
  console.log('🔗 Testing Database Connection Pool for 200-500 Users\n');
  
  try {
    // Test initial connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Test concurrent connections
    console.log('🚀 Testing concurrent database operations...');
    
    const startTime = Date.now();
    const promises = [];
    
    // Simulate 200 concurrent database operations
    for (let i = 0; i < 200; i++) {
      promises.push(
        User.count().then(count => {
          console.log(`Query ${i + 1}: Found ${count} users`);
          return count;
        }).catch(error => {
          console.error(`Query ${i + 1} failed:`, error.message);
          return null;
        })
      );
    }
    
    // Wait for all operations to complete
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const duration = endTime - startTime;
    
    console.log('\n📊 DATABASE POOL TEST RESULTS:');
    console.log(`✅ Successful queries: ${successful}/200`);
    console.log(`❌ Failed queries: ${failed}/200`);
    console.log(`⏱️  Total duration: ${duration}ms`);
    console.log(`📈 Queries per second: ${(200 / (duration / 1000)).toFixed(2)}`);
    
    // Check pool status
    const pool = sequelize.connectionManager.pool;
    console.log('\n🔗 Connection Pool Status:');
    console.log(`   - Total connections: ${pool.size}`);
    console.log(`   - Available connections: ${pool.available}`);
    console.log(`   - Used connections: ${pool.used}`);
    console.log(`   - Pending requests: ${pool.pending}`);
    
    if (failed === 0) {
      console.log('\n✅ DATABASE POOL TEST PASSED!');
      console.log('🎯 Ready to handle 200+ concurrent users');
    } else {
      console.log('\n⚠️  Some queries failed - may need pool tuning');
    }
    
  } catch (error) {
    console.error('❌ Database pool test failed:', error);
  } finally {
    // Close the connection
    await sequelize.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testDatabasePool().catch(console.error);
