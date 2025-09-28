#!/usr/bin/env node

/**
 * Delete Specific Users from Railway Production
 * This script will delete only the specified users by their WhatsApp numbers
 * Uses Railway API to connect to production database
 */

const fetch = require('node-fetch');

async function deleteSpecificUsersFromRailway() {
  try {
    console.log('🔍 Starting deletion of specific users from Railway production...');
    
    // Railway production API URL
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const headers = {
      'Content-Type': 'application/json',
      'username': 'admin',
      'password': 'admin123'
    };
    
    // List of WhatsApp numbers to delete
    const usersToDelete = [
      '13474461918',  // Rochel Golovan
      '17325038255',  // Addictive Ads
      '18459253715',  // Sara Rosenberg
      '923196612416', // code schode
      '15162826832',  // Baruch Weissman
      '17187445836',  // Shaina Sarah Schapiro
      '19174474418',  // M. Silber
      '19175456292',  // Shaya Levertov
      '12014666148',  // Aryeh Kugel
      '17322675297',  // S.R.
      '15166757017',  // Naft
      '19175614194'   // Hudi
    ];
    
    console.log(`🎯 Target users to delete: ${usersToDelete.length}`);
    console.log('📋 Users to be deleted:');
    usersToDelete.forEach((number, index) => {
      console.log(`${index + 1}. ${number}`);
    });
    
    // First, get all users from Railway
    console.log('\n📊 Fetching current users from Railway...');
    const usersResponse = await fetch(`${apiUrl}/admin/users`, {
      method: 'GET',
      headers
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status} ${usersResponse.statusText}`);
    }
    
    const allUsers = await usersResponse.json();
    console.log(`📊 Found ${allUsers.length} total users in Railway production`);
    
    // Find users that exist in the list to delete
    const existingUsers = allUsers.filter(user => 
      usersToDelete.includes(user.whatsapp_number) || 
      usersToDelete.includes(user.whatsapp_number.replace('+', ''))
    );
    
    console.log(`\n🔍 Found ${existingUsers.length} users in Railway to delete:`);
    existingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    if (existingUsers.length === 0) {
      console.log('✅ No users found to delete - they may have already been removed');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will permanently delete these users from Railway production!');
    console.log('🔄 Proceeding with deletion...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Try to delete each user via API
    for (let i = 0; i < existingUsers.length; i++) {
      const user = existingUsers[i];
      
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
              console.log(`✅ ${i + 1}/${existingUsers.length}: Deleted ${user.nickname} (${user.whatsapp_number})`);
              deleted = true;
              break;
            }
          } catch (endpointError) {
            // Try next endpoint
            continue;
          }
        }
        
        if (!deleted) {
          // Try POST with delete action
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
              console.log(`✅ ${i + 1}/${existingUsers.length}: Deleted ${user.nickname} (${user.whatsapp_number})`);
              deleted = true;
            }
          } catch (postError) {
            // Continue to next method
          }
        }
        
        if (!deleted) {
          errorCount++;
          console.log(`❌ ${i + 1}/${existingUsers.length}: Could not delete ${user.nickname} via API`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errorCount++;
        console.log(`❌ ${i + 1}/${existingUsers.length}: Error deleting ${user.nickname}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Deletion Summary:`);
    console.log(`✅ Successfully deleted: ${successCount} users`);
    console.log(`❌ Failed to delete: ${errorCount} users`);
    
    // Verify final state
    console.log('\n🔍 Verifying final user count...');
    const finalUsersResponse = await fetch(`${apiUrl}/admin/users`, {
      method: 'GET',
      headers
    });
    
    if (finalUsersResponse.ok) {
      const finalUsers = await finalUsersResponse.json();
      console.log(`📊 Final user count: ${finalUsers.length}`);
      
      // Show some remaining users as sample
      const sampleUsers = finalUsers.slice(0, 5);
      console.log('\n👤 Sample of remaining users:');
      sampleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
      });
      
      if (finalUsers.length > 5) {
        console.log(`... and ${finalUsers.length - 5} more users`);
      }
    }
    
    if (errorCount > 0) {
      console.log('\n💡 Some users could not be deleted via API. Alternative approaches:');
      console.log('1. Use Railway CLI: railway run node scripts/delete-specific-users.js');
      console.log('2. SSH into Railway and run the deletion script directly');
      console.log('3. Check if there are any foreign key constraints preventing deletion');
    } else {
      console.log('\n🎉 All specified users deleted successfully from Railway production!');
    }
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
  }
}

// Run the deletion
deleteSpecificUsersFromRailway();
