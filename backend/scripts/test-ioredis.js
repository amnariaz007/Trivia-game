#!/usr/bin/env node

const Redis = require('ioredis');

console.log('🔍 Testing ioredis Package');
console.log('==========================');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

if (!process.env.REDIS_URL) {
  console.log('❌ REDIS_URL not found in environment variables');
  process.exit(1);
}

console.log('\n🔗 Testing ioredis connection...');

async function testIoredis() {
  try {
    // Create Redis connection with ioredis
    const redis = new Redis(process.env.REDIS_URL, {
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    });

    console.log('✅ ioredis instance created successfully');

    // Test connection
    console.log('🔄 Testing connection...');
    const pong = await redis.ping();
    console.log('✅ Ping successful:', pong);

    // Test basic operations
    console.log('🔄 Testing set/get operations...');
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log('✅ Set/Get successful:', value);

    // Test hash operations
    console.log('🔄 Testing hash operations...');
    await redis.hset('test_hash', 'field1', 'value1');
    const hashValue = await redis.hget('test_hash', 'field1');
    console.log('✅ Hash operations successful:', hashValue);

    // Test list operations
    console.log('🔄 Testing list operations...');
    await redis.lpush('test_list', 'item1', 'item2');
    const listLength = await redis.llen('test_list');
    console.log('✅ List operations successful, length:', listLength);

    // Clean up
    console.log('🧹 Cleaning up test data...');
    await redis.del('test_key');
    await redis.del('test_hash');
    await redis.del('test_list');

    // Close connection
    await redis.quit();
    console.log('✅ Connection closed successfully');

    console.log('\n🎉 All ioredis tests passed!');
    console.log('✅ ioredis package is working correctly');
    console.log('✅ Redis connection is functional');
    console.log('✅ Basic operations are working');

  } catch (error) {
    console.error('\n❌ ioredis test failed:', error.message);
    console.error('Error details:', error);
    
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check if Redis service is running in Railway');
    console.log('2. Verify REDIS_URL format is correct');
    console.log('3. Check network connectivity');
    console.log('4. Ensure Redis service is properly connected to your Railway project');
    
    process.exit(1);
  }
}

testIoredis();
