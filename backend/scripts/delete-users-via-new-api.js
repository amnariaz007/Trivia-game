#!/usr/bin/env node

/**
 * Delete users via new API endpoints
 * This script will delete all users except your number using the new bulk-delete endpoint
 */

async function deleteUsersViaNewAPI() {
  try {
    console.log('🔍 Starting user deletion via new API endpoints...');
    console.log('🎯 Goal: Keep only your number (923196612416)');
    
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // First, get current user count
    console.log('📊 Fetching current users...');
    const usersResponse = await fetch(`${apiUrl}/admin/users`, {
      method: 'GET',
      headers
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }
    
    const users = await usersResponse.json();
    console.log(`📊 Found ${users.length} users in production`);
    
    // Find your user
    const myUser = users.find(user => 
      user.whatsapp_number === '+923196612416' || 
      user.whatsapp_number === '923196612416'
    );
    
    if (!myUser) {
      console.log('❌ Your number (923196612416) not found in production database');
      return;
    }
    
    console.log(`✅ Found your user: ${myUser.nickname} (${myUser.whatsapp_number})`);
    
    // Use the new bulk-delete endpoint
    console.log('\n🔄 Using new bulk-delete API endpoint...');
    
    const deleteResponse = await fetch(`${apiUrl}/admin/users/bulk-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        keepNumbers: ['923196612416', '+923196612416'] // Keep both formats
      })
    });
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Bulk delete failed: ${deleteResponse.status} - ${errorText}`);
    }
    
    const result = await deleteResponse.json();
    
    console.log('\n📊 Deletion Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`🗑️  Deleted: ${result.deletedCount} users`);
    console.log(`✅ Kept: ${result.keptCount} users`);
    console.log(`📊 Final count: ${result.finalCount} users`);
    
    if (result.keptUsers && result.keptUsers.length > 0) {
      console.log('\n👤 Kept users:');
      result.keptUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number})`);
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
      console.log(`📊 Final verification: ${finalUsers.length} users`);
      
      if (finalUsers.length === 1) {
        console.log('✅ Perfect! Only your number remains');
        console.log(`👤 Remaining user: ${finalUsers[0].nickname} (${finalUsers[0].whatsapp_number})`);
      } else {
        console.log('⚠️  Multiple users still exist');
        finalUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number})`);
        });
      }
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. ✅ Your number is kept for testing');
    console.log('2. ✅ Other users are safely backed up');
    console.log('3. ✅ You can now test with your number only');
    console.log('4. ✅ Use restore script to bring back other users later');
    
    console.log('\n📋 To restore all users later, run:');
    console.log('   node scripts/restore-users-via-new-api.js');
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
  }
}

// Run the deletion
deleteUsersViaNewAPI();
