#!/usr/bin/env node

/**
 * Upload Questions Script
 * This script uploads questions via CSV to the game
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const SERVER_URL = 'https://ingenious-abundance-production.up.railway.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const GAME_ID = '77735719-42ef-4af3-8f01-0e624db034ac';

console.log('📤 Uploading Questions to Game...');
console.log(`🌐 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game ID: ${GAME_ID}`);
console.log('');

async function uploadQuestions() {
  try {
    console.log('📝 Step 1: Reading CSV file...');
    
    const csvPath = './test-questions.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      return;
    }
    
    console.log('✅ CSV file found');
    
    console.log('');
    console.log('📤 Step 2: Uploading questions...');
    
    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream(csvPath));
    
    const response = await axios.post(`${SERVER_URL}/admin/games/${GAME_ID}/questions/import-csv`, formData, {
      headers: {
        ...formData.getHeaders(),
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
      }
    });
    
    console.log('✅ Questions uploaded successfully!');
    console.log('📊 Response:', response.data);
    
    console.log('');
    console.log('🎉 Questions Added!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. ✅ Questions added to game');
    console.log('2. 🚀 Now you can start the game');
    console.log('3. 📱 Send "JOIN" to your WhatsApp bot');
    console.log('4. 🎯 Answer the questions as they come');
    
  } catch (error) {
    console.error('❌ Error uploading questions:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
  }
}

// Run the script
uploadQuestions();
