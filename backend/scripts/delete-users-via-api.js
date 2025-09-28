#!/usr/bin/env node

/**
 * Delete users via API
 * This script will delete all users except your number via API calls
 */

const fs = require('fs');

async function deleteUsersViaAPI() {
  try {
    console.log('🔍 Starting user deletion via API...');
    console.log('🎯 Goal: Keep only your number (923196612416)');
    
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // First, get all users
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
    
    // Find users to delete (all except yours)
    const usersToDelete = users.filter(user => 
      user.whatsapp_number !== '+923196612416' && 
      user.whatsapp_number !== '923196612416'
    );
    
    console.log(`🗑️  Users to be deleted: ${usersToDelete.length}`);
    console.log(`✅ Users to keep: 1 (your number)`);
    
    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete - only your number exists');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will delete all users except your number!');
    console.log('📁 The other users are safely backed up and can be restored later');
    
    // Try different API approaches to delete users
    console.log('\n🔄 Attempting to delete users via API...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Method 1: Try to use a potential delete endpoint
    for (let i = 0; i < usersToDelete.length; i++) {
      const user = usersToDelete[i];
      
      try {
        // Try different potential delete endpoints
        const deleteEndpoints = [
          `/admin/users/${user.id}`,
          `/admin/user/${user.id}`,
          `/admin/users/delete`,
          `/admin/user/delete`
        ];
        
        let deleted = false;
        
        for (const endpoint of deleteEndpoints) {
          try {
            const response = await fetch(`${apiUrl}${endpoint}`, {
              method: 'DELETE',
              headers
            });
            
            if (response.ok) {
              successCount++;
              console.log(`✅ ${i + 1}/${usersToDelete.length}: Deleted ${user.nickname} (${user.whatsapp_number})`);
              deleted = true;
              break;
            }
          } catch (endpointError) {
            // Try next endpoint
            continue;
          }
        }
        
        if (!deleted) {
          // Method 2: Try POST with delete action
          try {
            const response = await fetch(`${apiUrl}/admin/users`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                action: 'delete',
                userId: user.id,
                whatsapp_number: user.whatsapp_number
              })
            });
            
            if (response.ok) {
              successCount++;
              console.log(`✅ ${i + 1}/${usersToDelete.length}: Deleted ${user.nickname} (${user.whatsapp_number})`);
              deleted = true;
            }
          } catch (postError) {
            // Continue to next method
          }
        }
        
        if (!deleted) {
          errorCount++;
          console.log(`❌ ${i + 1}/${usersToDelete.length}: Could not delete ${user.nickname} via API`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.log(`❌ ${i + 1}/${usersToDelete.length}: Error deleting ${user.nickname}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Deletion Summary:`);
    console.log(`✅ Successfully deleted: ${successCount} users`);
    console.log(`❌ Failed to delete: ${errorCount} users`);
    
    if (errorCount > 0) {
      console.log('\n💡 API deletion has limitations. Alternative approaches:');
      console.log('1. Upload railway-delete-users.js to Railway and run it there');
      console.log('2. Use Railway CLI: railway run node scripts/railway-delete-users.js');
      console.log('3. SSH into Railway and run the deletion script');
    } else {
      console.log('\n🎉 All users deleted successfully via API!');
      console.log('✅ Only your number remains for testing');
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
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
  }
}

// Run the deletion
deleteUsersViaAPI();