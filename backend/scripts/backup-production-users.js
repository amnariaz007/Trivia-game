#!/usr/bin/env node

const { User, GamePlayer } = require('../models');
const fs = require('fs');
const path = require('path');

async function backupProductionUsers() {
  try {
    console.log('💾 Backing up production users for safe testing...\n');
    
    // Get all active users
    const users = await User.findAll({
      where: { is_active: true },
      include: [{
        model: GamePlayer,
        as: 'gamePlayers',
        where: { status: 'alive' },
        required: false
      }]
    });
    
    console.log(`👥 Found ${users.length} active users to backup`);
    
    if (users.length === 0) {
      console.log('❌ No users found to backup');
      return;
    }
    
    // Create backup data
    const backupData = {
      timestamp: new Date().toISOString(),
      userCount: users.length,
      users: users.map(user => ({
        id: user.id,
        whatsapp_number: user.whatsapp_number,
        nickname: user.nickname,
        is_active: user.is_active,
        last_activity: user.last_activity,
        registration_completed: user.registration_completed,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    };
    
    // Save to backup file
    const backupPath = path.join(__dirname, '..', 'backups', 'production-users-backup.json');
    const backupDir = path.dirname(backupPath);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Users backed up to: ${backupPath}`);
    console.log(`📊 Backup contains ${users.length} users`);
    console.log(`⏰ Backup timestamp: ${backupData.timestamp}`);
    
    return backupPath;
    
  } catch (error) {
    console.error('❌ Error backing up users:', error);
    throw error;
  }
}

// Run the backup
backupProductionUsers().catch(console.error);
