#!/usr/bin/env node

const Redis = require('ioredis');

console.log('🔍 Testing Redis Connection');
console.log('==========================');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

if (!process.env.REDIS_URL) {
  console.log('❌ REDIS_URL not found in environment variables');
  process.exit(1);
}

console.log('\n🔗 Testing Redis connection...');

// Test with different configurations
const configs = [
  {
    name: 'Basic Connection',
    config: process.env.REDIS_URL
  },
  {
    name: 'With TLS (Production)',
    config: {
      url: process.env.REDIS_URL,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined
    }
  },
  {
    name: 'With Timeout',
    config: {
      url: process.env.REDIS_URL,
      connectTimeout: 10000,
      commandTimeout: 5000,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined
    }
  }
];

async function testRedisConnection(name, config) {
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    const redis = new Redis(config);
    
    // Test ping
    const pong = await redis.ping();
    console.log(`✅ Ping successful: ${pong}`);
    
    // Test set/get
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log(`✅ Set/Get successful: ${value}`);
    
    // Clean up
    await redis.del('test_key');
    await redis.quit();
    
    console.log(`✅ ${name} - Connection successful!`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${name} - Connection failed:`, error.message);
    return false;
  }
}

async function runTests() {
  let successCount = 0;
  
  for (const config of configs) {
    const success = await testRedisConnection(config.name, config.config);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Results: ${successCount}/${configs.length} configurations successful`);
  
  if (successCount === 0) {
    console.log('\n❌ All Redis connection tests failed!');
    console.log('Possible issues:');
    console.log('1. Redis service not running in Railway');
    console.log('2. Incorrect REDIS_URL format');
    console.log('3. Network connectivity issues');
    console.log('4. Redis service not properly connected to your Railway project');
    process.exit(1);
  } else {
    console.log('\n✅ Redis connection is working!');
    process.exit(0);
  }
}

runTests().catch(console.error);
