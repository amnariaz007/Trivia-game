#!/usr/bin/env node

/**
 * Restore users via new API endpoints
 * This script will restore the 98 users from the backup file using the new restore endpoint
 */

const fs = require('fs');

async function restoreUsersViaNewAPI() {
  try {
    console.log('🔍 Starting user restoration via new API endpoints...');
    
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
    
    // Use the new restore endpoint
    console.log('\n🔄 Using new restore API endpoint...');
    
    const restoreResponse = await fetch(`${apiUrl}/admin/users/restore`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        users: usersToRestore
      })
    });
    
    if (!restoreResponse.ok) {
      const errorText = await restoreResponse.text();
      throw new Error(`Restore failed: ${restoreResponse.status} - ${errorText}`);
    }
    
    const result = await restoreResponse.json();
    
    console.log('\n📊 Restoration Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Total users: ${result.totalUsers}`);
    console.log(`✅ Successfully restored: ${result.successCount} users`);
    console.log(`❌ Failed to restore: ${result.errorCount} users`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.user}: ${error.error}`);
      });
    }
    
    // Verify final state
    console.log('\n🔍 Verifying final user count...');
    const finalUsersResponse = await fetch(`${apiUrl}/admin/users`, {
      method: 'GET',
      headers
    });
    
    if (finalUsersResponse.ok) {
      const finalUsers = await finalUsersResponse.json();
      console.log(`📊 Final user count: ${finalUsers.length}`);
      
      if (finalUsers.length >= 99) {
        console.log('✅ All users restored successfully!');
      } else {
        console.log(`⚠️  Expected 99 users, got ${finalUsers.length}`);
      }
    }
    
    console.log('\n🎯 Restoration complete!');
    console.log('✅ All users are back in production');
    console.log('✅ You can now create games for all users');
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
  }
}

// Run the restoration
restoreUsersViaNewAPI();
