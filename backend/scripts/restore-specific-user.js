#!/usr/bin/env node

/**
 * Restore a specific user via API
 * This script will restore the user 923320477770 (Osama Malhi)
 */

async function restoreSpecificUser() {
  try {
    console.log('🔍 Restoring specific user: 923320477770 (Osama Malhi)...');
    
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // User data from backup
    const userToRestore = {
      id: "75d9ef62-c1bf-47c7-8143-47d6130eb23e",
      nickname: "Osama Malhi",
      whatsapp_number: "923320477770",
      is_active: true,
      createdAt: "9/27/2025, 2:23:14 PM",
      last_activity: "9/27/2025, 2:23:14 PM"
    };
    
    console.log(`👤 User to restore: ${userToRestore.nickname} (${userToRestore.whatsapp_number})`);
    
    // Use the new restore endpoint
    console.log('\n🔄 Using restore API endpoint...');
    
    const restoreResponse = await fetch(`${apiUrl}/admin/users/restore`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        users: [userToRestore]
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
      
      console.log('\n👤 Current users:');
      finalUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number})`);
      });
    }
    
    console.log('\n🎯 User restoration complete!');
    console.log('✅ Osama Malhi (923320477770) has been restored');
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
  }
}

// Run the restoration
restoreSpecificUser();
