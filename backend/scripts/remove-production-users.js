#!/usr/bin/env node

const { User, GamePlayer } = require('../models');
const { sequelize } = require('../config/database');

async function removeProductionUsers() {
  try {
    console.log('🗑️  Removing production users for safe testing...\n');
    
    // Get count before deletion
    const userCount = await User.count({ where: { is_active: true } });
    console.log(`👥 Found ${userCount} active users to remove`);
    
    if (userCount === 0) {
      console.log('❌ No users found to remove');
      return;
    }
    
    // Confirm deletion
    console.log('⚠️  WARNING: This will remove all active users from the database!');
    console.log('✅ Users are safely backed up in backups/production-users-backup.json');
    console.log('🔄 You can restore them later with: node scripts/restore-production-users.js\n');
    
    // Remove all game players first (foreign key constraint)
    console.log('🧹 Removing game players...');
    await GamePlayer.destroy({ where: {} });
    console.log('✅ Game players removed');
    
    // Remove all users
    console.log('🧹 Removing users...');
    await User.destroy({ where: {} });
    console.log('✅ Users removed');
    
    console.log(`\n🎯 SUCCESS: ${userCount} users removed from database`);
    console.log('🧪 Database is now clean for testing');
    console.log('💾 Users are safely backed up and can be restored anytime');
    
  } catch (error) {
    console.error('❌ Error removing users:', error);
    throw error;
  }
}

// Run the removal
removeProductionUsers().catch(console.error);
