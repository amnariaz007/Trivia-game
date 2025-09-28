#!/usr/bin/env node

/**
 * Diagnose Message Queue Issues
 * This script checks if the message queue is working properly
 */

const fetch = require('node-fetch');

async function diagnoseQueue() {
  try {
    console.log('🔍 Diagnosing message queue issues...');
    
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // Test 1: Check if we can add a message to queue
    console.log('\n📤 Test 1: Testing message queue...');
    try {
      const testMessage = {
        to: '923196612416',
        message: '🧪 Queue test message'
      };
      
      const response = await fetch(`${apiUrl}/admin/send-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testMessage)
      });
      
      const responseText = await response.text();
      console.log('📊 Response status:', response.status);
      console.log('📊 Response body:', responseText);
      
      if (response.ok) {
        console.log('✅ Message queued successfully');
      } else {
        console.log('❌ Message queuing failed');
      }
    } catch (error) {
      console.log('❌ Message queue test error:', error.message);
    }
    
    // Test 2: Check if we can get users (to verify API is working)
    console.log('\n👥 Test 2: Testing basic API functionality...');
    try {
      const response = await fetch(`${apiUrl}/admin/users`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log('✅ API is working, found', users.length, 'users');
      } else {
        console.log('❌ Basic API test failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Basic API test error:', error.message);
    }
    
    // Test 3: Check if we can get stats
    console.log('\n📊 Test 3: Testing stats endpoint...');
    try {
      const response = await fetch(`${apiUrl}/admin/stats`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const stats = await response.json();
        console.log('✅ Stats endpoint working');
        console.log('📊 Stats:', JSON.stringify(stats, null, 2));
      } else {
        console.log('❌ Stats endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Stats endpoint error:', error.message);
    }
    
    console.log('\n🎯 Diagnosis Summary:');
    console.log('The issue is likely one of these:');
    console.log('1. ❌ Redis connection is down or misconfigured');
    console.log('2. ❌ Message queue (Bull) is not initialized properly');
    console.log('3. ❌ WhatsApp API credentials are invalid or expired');
    console.log('4. ❌ Message queue workers are not processing jobs');
    
    console.log('\n💡 Solutions to try:');
    console.log('1. Check Railway logs for Redis connection errors');
    console.log('2. Verify WhatsApp API credentials in Railway environment variables');
    console.log('3. Restart the Railway deployment to reinitialize queues');
    console.log('4. Check if Redis URL is correct in Railway environment');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseQueue();
