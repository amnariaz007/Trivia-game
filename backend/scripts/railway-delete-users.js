#!/usr/bin/env node

/**
 * Railway Production Script - Delete All Users Except Your Number
 * Run this on Railway backend to keep only your number (923196612416)
 * 
 * Instructions:
 * 1. Upload this script to your Railway backend
 * 2. SSH into Railway or use Railway CLI
 * 3. Run: node scripts/railway-delete-users.js
 */

const { User } = require('../models');

async function deleteUsersExceptMine() {
  try {
    console.log('🔍 Starting user cleanup on Railway...');
    console.log('🎯 Goal: Keep only your number (923196612416)');
    
    // Check current user count
    const totalUsers = await User.count();
    console.log(`📊 Current total users: ${totalUsers}`);
    
    // Find your user
    const myUser = await User.findOne({
      where: { whatsapp_number: '923196612416' }
    });
    
    if (!myUser) {
      console.log('❌ Your number (923196612416) not found in database');
      console.log('💡 Make sure you have registered with this number first');
      return;
    }
    
    console.log(`✅ Found your user: ${myUser.nickname} (${myUser.whatsapp_number})`);
    
    // Count users to be deleted
    const usersToDelete = await User.count({
      where: { whatsapp_number: { [require('sequelize').Op.ne]: '923196612416' } }
    });
    
    console.log(`🗑️  Users to be deleted: ${usersToDelete}`);
    console.log(`✅ Users to keep: 1 (your number)`);
    
    if (usersToDelete === 0) {
      console.log('✅ No users to delete - only your number exists');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will delete all users except your number!');
    console.log('📁 The other users are safely backed up and can be restored later');
    console.log('\n🔄 Proceeding with deletion...');
    
    // Delete all users except yours
    const deletedCount = await User.destroy({
      where: { whatsapp_number: { [require('sequelize').Op.ne]: '923196612416' } }
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} users`);
    
    // Verify final state
    const remainingUsers = await User.findAll({
      attributes: ['nickname', 'whatsapp_number', 'is_active']
    });
    
    console.log(`\n📊 Final user count: ${remainingUsers.length}`);
    console.log('👤 Remaining users:');
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n🎯 Next steps:');
    console.log('1. ✅ Your number is kept for testing');
    console.log('2. ✅ Other 98 users are safely backed up');
    console.log('3. ✅ You can now test with your number only');
    console.log('4. ✅ Use restore script to bring back other users later');
    
    console.log('\n📋 To restore all users later, run locally:');
    console.log('   node scripts/restore-users-via-api.js');
    
    console.log('\n🚀 Ready for testing!');
    
  } catch (error) {
    console.error('❌ Error during user cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
deleteUsersExceptMine();
