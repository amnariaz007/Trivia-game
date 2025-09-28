#!/usr/bin/env node

const { User } = require('../models');
const fs = require('fs');
const path = require('path');

async function restoreProductionUsers() {
  try {
    console.log('🔄 Restoring production users...\n');
    
    // Find backup file
    const backupPath = path.join(__dirname, '..', 'backups', 'production-users-backup.json');
    
    if (!fs.existsSync(backupPath)) {
      console.log('❌ Backup file not found:', backupPath);
      console.log('💡 Make sure you have backed up users first with: node scripts/backup-production-users.js');
      return;
    }
    
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📊 Found backup with ${backupData.userCount} users`);
    console.log(`⏰ Backup timestamp: ${backupData.timestamp}`);
    
    // Restore users
    console.log('🔄 Restoring users to database...');
    
    for (const userData of backupData.users) {
      await User.create({
        whatsapp_number: userData.whatsapp_number,
        nickname: userData.nickname,
        is_active: userData.is_active,
        last_activity: userData.last_activity,
        registration_completed: userData.registration_completed
      });
    }
    
    console.log(`✅ SUCCESS: ${backupData.userCount} users restored to database`);
    console.log('🎉 Production users are back and ready for live games!');
    
  } catch (error) {
    console.error('❌ Error restoring users:', error);
    throw error;
  }
}

// Run the restoration
restoreProductionUsers().catch(console.error);
