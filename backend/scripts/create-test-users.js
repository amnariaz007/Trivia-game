#!/usr/bin/env node

const { User } = require('../models');

async function createTestUsers() {
  try {
    console.log('🧪 Creating test users for safe testing...\n');
    
    // Create test users with fake phone numbers
    const testUsers = [
      { whatsapp_number: '+1234567890', nickname: 'TestUser1' },
      { whatsapp_number: '+1234567891', nickname: 'TestUser2' },
      { whatsapp_number: '+1234567892', nickname: 'TestUser3' },
      { whatsapp_number: '+1234567893', nickname: 'TestUser4' },
      { whatsapp_number: '+1234567894', nickname: 'TestUser5' },
      { whatsapp_number: '+1234567895', nickname: 'TestUser6' },
      { whatsapp_number: '+1234567896', nickname: 'TestUser7' },
      { whatsapp_number: '+1234567897', nickname: 'TestUser8' },
      { whatsapp_number: '+1234567898', nickname: 'TestUser9' },
      { whatsapp_number: '+1234567899', nickname: 'TestUser10' }
    ];
    
    console.log(`👥 Creating ${testUsers.length} test users...`);
    
    for (const userData of testUsers) {
      await User.create({
        whatsapp_number: userData.whatsapp_number,
        nickname: userData.nickname,
        is_active: true,
        registration_completed: true,
        last_activity: new Date()
      });
    }
    
    console.log(`✅ SUCCESS: ${testUsers.length} test users created`);
    console.log('🧪 You can now test games safely with these fake users');
    console.log('📱 Test phone numbers: +1234567890 to +1234567899');
    console.log('💡 These are fake numbers - no real WhatsApp messages will be sent');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  }
}

// Run the creation
createTestUsers().catch(console.error);
