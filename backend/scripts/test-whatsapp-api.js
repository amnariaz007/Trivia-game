#!/usr/bin/env node

/**
 * Test WhatsApp API Connection
 * This script tests if the WhatsApp API is working properly
 */

const fetch = require('node-fetch');

async function testWhatsAppAPI() {
  try {
    console.log('🔍 Testing WhatsApp API connection...');
    
    // Railway production API URL
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // Test 1: Check if WhatsApp service is responding
    console.log('\n📡 Test 1: Checking WhatsApp service status...');
    try {
      const response = await fetch(`${apiUrl}/admin/whatsapp-status`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ WhatsApp service status:', data);
      } else {
        console.log('❌ WhatsApp service status check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ WhatsApp service status check error:', error.message);
    }
    
    // Test 2: Try to send a test message
    console.log('\n📤 Test 2: Sending test message...');
    try {
      const testMessage = {
        to: '923196612416', // Your number
        message: '🧪 Test message from Railway - API is working!',
        messageType: 'test'
      };
      
      const response = await fetch(`${apiUrl}/admin/send-test-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testMessage)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Test message sent successfully:', data);
      } else {
        const errorText = await response.text();
        console.log('❌ Test message failed:', response.status, errorText);
      }
    } catch (error) {
      console.log('❌ Test message error:', error.message);
    }
    
    // Test 3: Check queue status
    console.log('\n📊 Test 3: Checking message queue status...');
    try {
      const response = await fetch(`${apiUrl}/admin/queue-status`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Queue status:', data);
      } else {
        console.log('❌ Queue status check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Queue status check error:', error.message);
    }
    
    // Test 4: Check Redis connection
    console.log('\n🔴 Test 4: Checking Redis connection...');
    try {
      const response = await fetch(`${apiUrl}/admin/redis-status`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Redis status:', data);
      } else {
        console.log('❌ Redis status check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Redis status check error:', error.message);
    }
    
    console.log('\n🎯 Diagnosis Summary:');
    console.log('1. Check if WhatsApp API credentials are valid');
    console.log('2. Check if message queue is processing jobs');
    console.log('3. Check if Redis is connected and working');
    console.log('4. Check Railway logs for specific error messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWhatsAppAPI();
