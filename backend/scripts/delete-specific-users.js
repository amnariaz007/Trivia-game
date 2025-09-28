#!/usr/bin/env node

/**
 * Delete Specific Users Script
 * This script will delete only the specified users by their WhatsApp numbers
 */

const { User } = require('../models');

async function deleteSpecificUsers() {
  try {
    console.log('🔍 Starting deletion of specific users...');
    
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
    
    // Check current user count
    const totalUsers = await User.count();
    console.log(`\n📊 Current total users in database: ${totalUsers}`);
    
    // Find users that exist in database
    const existingUsers = await User.findAll({
      where: { 
        whatsapp_number: usersToDelete 
      },
      attributes: ['id', 'nickname', 'whatsapp_number', 'is_active']
    });
    
    console.log(`\n🔍 Found ${existingUsers.length} users in database to delete:`);
    existingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    if (existingUsers.length === 0) {
      console.log('✅ No users found to delete - they may have already been removed');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will permanently delete these users!');
    console.log('🔄 Proceeding with deletion...');
    
    // Delete the specific users
    const deletedCount = await User.destroy({
      where: { 
        whatsapp_number: usersToDelete 
      }
    });
    
    console.log(`\n✅ Successfully deleted ${deletedCount} users`);
    
    // Verify final state
    const remainingUsers = await User.count();
    console.log(`\n📊 Final user count: ${remainingUsers}`);
    
    // Show some remaining users as sample
    const sampleUsers = await User.findAll({
      attributes: ['nickname', 'whatsapp_number', 'is_active'],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n👤 Sample of remaining users:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    if (remainingUsers > 5) {
      console.log(`... and ${remainingUsers - 5} more users`);
    }
    
    console.log('\n🎉 Deletion completed successfully!');
    console.log('✅ Specified users have been removed from the database');
    
  } catch (error) {
    console.error('❌ Error during user deletion:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the deletion
deleteSpecificUsers();
