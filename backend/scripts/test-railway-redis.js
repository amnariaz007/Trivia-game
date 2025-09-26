#!/usr/bin/env node

const Redis = require("ioredis");

console.log('🔍 Testing Railway Redis Connection');
console.log('===================================');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

if (!process.env.REDIS_URL) {
  console.log('❌ REDIS_URL not found in environment variables');
  console.log('Please add Redis service to your Railway project');
  process.exit(1);
}

console.log('\n🔗 Creating Redis connection...');

// Create Redis connection (Railway recommended pattern)
const redis = new Redis(process.env.REDIS_URL);

// Add event listeners (Railway recommended pattern)
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

redis.on("close", () => {
  console.log("⚠️  Redis connection closed");
});

// Test Redis operations
async function testRedis() {
  try {
    console.log('\n🧪 Testing Redis operations...');
    
    // Test ping
    const pong = await redis.ping();
    console.log('✅ Ping successful:', pong);
    
    // Test set/get
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log('✅ Set/Get successful:', value);
    
    // Test with timestamp
    const timestamp = new Date().toISOString();
    await redis.set('last_test', timestamp);
    const lastTest = await redis.get('last_test');
    console.log('✅ Timestamp test successful:', lastTest);
    
    // Clean up
    await redis.del('test_key');
    await redis.del('last_test');
    console.log('✅ Cleanup completed');
    
    // Close connection
    await redis.quit();
    console.log('\n🎉 Railway Redis test completed successfully!');
    console.log('✅ Your Redis service is working correctly');
    
  } catch (error) {
    console.error('\n❌ Redis test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if Redis service is running in Railway');
    console.log('2. Verify REDIS_URL is correct');
    console.log('3. Check Railway service logs');
    console.log('4. Ensure Redis service is connected to your app');
    process.exit(1);
  }
}

// Run test after a short delay to allow connection
setTimeout(testRedis, 1000);
