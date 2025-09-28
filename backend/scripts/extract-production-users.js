#!/usr/bin/env node

/**
 * Extract all users from production database and save to JSON file
 * This script safely backs up all production users without affecting the database
 */

const { User } = require('../models');
const fs = require('fs');
const path = require('path');

async function extractProductionUsers() {
  try {
    console.log('🔍 Connecting to production database...');
    
    // Get all users from database
    const users = await User.findAll({
      attributes: [
        'id',
        'nickname', 
        'whatsapp_number',
        'is_active',
        'created_at',
        'updated_at',
        'last_activity'
      ],
      order: [['created_at', 'ASC']]
    });

    console.log(`📊 Found ${users.length} users in production database`);

    // Prepare data for export
    const usersData = {
      extracted_at: new Date().toISOString(),
      total_users: users.length,
      users: users.map(user => ({
        id: user.id,
        nickname: user.nickname,
        whatsapp_number: user.whatsapp_number,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_activity: user.last_activity
      }))
    };

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `production-users-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(usersData, null, 2));

    console.log(`✅ Successfully extracted ${users.length} users`);
    console.log(`📁 Saved to: ${filepath}`);
    console.log(`📊 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    // Show sample of extracted data
    console.log('\n📋 Sample of extracted users:');
    users.slice(0, 3).forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    if (users.length > 3) {
      console.log(`... and ${users.length - 3} more users`);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Users are safely backed up');
    console.log('2. You can now test with test users');
    console.log('3. Use restore script to bring them back when needed');

  } catch (error) {
    console.error('❌ Error extracting users:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the extraction
extractProductionUsers();
