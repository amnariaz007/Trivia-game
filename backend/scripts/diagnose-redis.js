#!/usr/bin/env node

console.log('🔍 Redis Connection Diagnosis');
console.log('=============================');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_URL:', process.env.REDIS_URL);

if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    console.log('\nRedis URL Analysis:');
    console.log('Protocol:', url.protocol);
    console.log('Hostname:', url.hostname);
    console.log('Port:', url.port || '6379');
    console.log('Username:', url.username || 'default');
    console.log('Password:', url.password ? '***SET***' : 'NOT SET');
    
    console.log('\n🔍 Railway Redis Service Check:');
    console.log('1. Go to your Railway project dashboard');
    console.log('2. Check if you have a Redis service added');
    console.log('3. Make sure the Redis service is running');
    console.log('4. Verify the service is connected to your main app');
    
    if (url.hostname === 'redis.railway.internal') {
      console.log('\n⚠️  Using Railway internal Redis URL');
      console.log('This means Redis service should be in the same Railway project');
      console.log('Check if Redis service is properly connected');
    }
    
  } catch (error) {
    console.log('❌ Invalid REDIS_URL format:', error.message);
  }
} else {
  console.log('❌ REDIS_URL not found');
}

console.log('\n🔧 Railway Redis Setup Steps:');
console.log('1. Go to Railway dashboard');
console.log('2. Click "New" → "Database" → "Redis"');
console.log('3. Wait for Redis service to start');
console.log('4. Railway will automatically set REDIS_URL');
console.log('5. Redeploy your app');
