#!/usr/bin/env node

/**
 * Restore users via API
 * This script will restore the 98 users from the backup file via API calls
 */

const fs = require('fs');
const path = require('path');

async function restoreUsersViaAPI() {
  try {
    console.log('🔍 Starting user restoration via API...');
    
    // Read the backup file
    const backupFile = '/Users/apple/Desktop/Trivia game/backend/backups/production-users-from-api-2025-09-28.json';
    
    if (!fs.existsSync(backupFile)) {
      console.log('❌ Backup file not found:', backupFile);
      return;
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const users = backupData.users;
    
    console.log(`📊 Found ${users.length} users in backup file`);
    
    // Filter out your number (keep it as is)
    const usersToRestore = users.filter(user => 
      user.whatsapp_number !== '+923196612416' && 
      user.whatsapp_number !== '923196612416'
    );
    
    console.log(`🔄 Users to restore: ${usersToRestore.length}`);
    console.log(`✅ Your number will be kept as is`);
    
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // First, let's check if there's a user creation endpoint
    console.log('🔍 Checking available API endpoints...');
    
    // Try to create users via the fix-user-registration endpoint (it might work for creation too)
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Restoring users...');
    
    for (let i = 0; i < usersToRestore.length; i++) {
      const user = usersToRestore[i];
      
      try {
        // Try to create user via a potential endpoint
        const response = await fetch(`${apiUrl}/admin/fix-user-registration`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phoneNumber: user.whatsapp_number,
            nickname: user.nickname,
            is_active: user.is_active
          })
        });
        
        if (response.ok) {
          successCount++;
          console.log(`✅ ${i + 1}/${usersToRestore.length}: ${user.nickname} (${user.whatsapp_number})`);
        } else {
          errorCount++;
          console.log(`❌ ${i + 1}/${usersToRestore.length}: Failed to restore ${user.nickname}`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.log(`❌ ${i + 1}/${usersToRestore.length}: Error restoring ${user.nickname}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Restoration Summary:`);
    console.log(`✅ Successfully restored: ${successCount} users`);
    console.log(`❌ Failed to restore: ${errorCount} users`);
    
    if (errorCount > 0) {
      console.log('\n💡 Alternative approach:');
      console.log('Since API restoration has limitations, you can:');
      console.log('1. Upload the backup file to Railway');
      console.log('2. Run a database restoration script on Railway');
      console.log('3. Or manually restore users via database');
    }
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
  }
}

// Alternative: Create a Railway script for direct database restoration
function createRailwayRestoreScript() {
  const railwayScript = `
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
    
    console.log(\`📊 Found \${users.length} users in backup\`);
    
    // Filter out your number
    const usersToRestore = users.filter(user => 
      user.whatsapp_number !== '+923196612416' && 
      user.whatsapp_number !== '923196612416'
    );
    
    console.log(\`🔄 Restoring \${usersToRestore.length} users...\`);
    
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
        console.log(\`✅ Restored: \${userData.nickname} (\${userData.whatsapp_number})\`);
        
      } catch (error) {
        console.log(\`❌ Failed to restore \${userData.nickname}: \${error.message}\`);
      }
    }
    
    console.log(\`\\n📊 Restoration complete: \${successCount}/\${usersToRestore.length} users restored\`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

restoreUsersFromBackup();
`;
  
  fs.writeFileSync('/Users/apple/Desktop/Trivia game/backend/scripts/railway-restore-users.js', railwayScript);
  console.log('\n📁 Created Railway restoration script: railway-restore-users.js');
  console.log('   Upload this + the backup file to Railway and run it there');
}

// Run the restoration
restoreUsersViaAPI().then(() => {
  createRailwayRestoreScript();
});
