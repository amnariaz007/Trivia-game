
// Railway Production Script - Restore Users from Backup
// Run this on Railway backend: node scripts/railway-restore-users.js

const { User } = require('./models');
const fs = require('fs');

async function restoreUsersFromBackup() {
  try {
    console.log('🔍 Starting user restoration on Railway...');
    
    // Read backup file (upload this file to Railway)
    const backupData = JSON.parse(fs.readFileSync('production-users-from-api-2025-09-28.json', 'utf8'));
    const users = backupData.users;
    
    console.log(`📊 Found ${users.length} users in backup`);
    
    // Filter out your number
    const usersToRestore = users.filter(user => 
      user.whatsapp_number !== '+923196612416' && 
      user.whatsapp_number !== '923196612416'
    );
    
    console.log(`🔄 Restoring ${usersToRestore.length} users...`);
    
    let successCount = 0;
    
    for (const userData of usersToRestore) {
      try {
        await User.findOrCreate({
          where: { whatsapp_number: userData.whatsapp_number },
          defaults: {
            nickname: userData.nickname,
            whatsapp_number: userData.whatsapp_number,
            is_active: userData.is_active,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            last_activity: userData.last_activity
          }
        });
        
        successCount++;
        console.log(`✅ Restored: ${userData.nickname} (${userData.whatsapp_number})`);
        
      } catch (error) {
        console.log(`❌ Failed to restore ${userData.nickname}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Restoration complete: ${successCount}/${usersToRestore.length} users restored`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

restoreUsersFromBackup();
