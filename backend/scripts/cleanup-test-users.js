#!/usr/bin/env node

require('dotenv').config();
const { User, GamePlayer, PlayerAnswer } = require('../models');

async function cleanupTestUsers() {
  try {
    console.log('🧹 Cleaning up test users...\n');
    
    // The phone number you want to keep (formatted for database)
    const keepPhoneNumber = '923196612416'; // This is 03196612416 with country code
    
    console.log(`📱 Keeping only phone number: ${keepPhoneNumber}`);
    console.log(`📱 This corresponds to: 03196612416\n`);
    
    // Find all users except the one we want to keep
    const usersToDelete = await User.findAll({
      where: {
        whatsapp_number: {
          [require('sequelize').Op.ne]: keepPhoneNumber
        }
      }
    });
    
    console.log(`🔍 Found ${usersToDelete.length} users to delete:`);
    usersToDelete.forEach(user => {
      console.log(`   - ${user.nickname} (${user.whatsapp_number})`);
    });
    
    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. Only the target number exists.');
      return;
    }
    
    console.log('\n🗑️  Deleting users and related data...');
    
    // Delete related data first
    for (const user of usersToDelete) {
      console.log(`   Deleting data for ${user.nickname}...`);
      
      // Delete player answers
      await PlayerAnswer.destroy({
        where: { user_id: user.id }
      });
      
      // Delete game players
      await GamePlayer.destroy({
        where: { user_id: user.id }
      });
      
      // Delete the user
      await user.destroy();
      
      console.log(`   ✅ Deleted ${user.nickname}`);
    }
    
    console.log('\n✅ Cleanup complete!');
    
    // Show remaining users
    const remainingUsers = await User.findAll();
    console.log(`\n📊 Remaining users (${remainingUsers.length}):`);
    remainingUsers.forEach(user => {
      console.log(`   - ${user.nickname} (${user.whatsapp_number})`);
    });
    
    // Verify the target user exists
    const targetUser = await User.findOne({
      where: { whatsapp_number: keepPhoneNumber }
    });
    
    if (targetUser) {
      console.log(`\n✅ Target user found: ${targetUser.nickname} (${targetUser.whatsapp_number})`);
    } else {
      console.log(`\n⚠️  Target user not found. Creating it...`);
      await User.create({
        nickname: 'TestUser',
        whatsapp_number: keepPhoneNumber,
        is_active: true,
        registration_completed: true
      });
      console.log(`✅ Created target user: TestUser (${keepPhoneNumber})`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanupTestUsers();



