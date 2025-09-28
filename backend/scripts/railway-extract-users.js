#!/usr/bin/env node

/**
 * Railway Production User Extraction Script
 * Run this script on Railway backend to extract all users
 * This script will output JSON that you can copy and save locally
 */

const { User } = require('../models');
const fs = require('fs');

async function extractUsersForRailway() {
  try {
    console.log('🔍 Extracting users from Railway production database...');
    
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

    // Output JSON to console (you can copy this)
    console.log('\n📋 COPY THE JSON BELOW AND SAVE IT LOCALLY:');
    console.log('=' .repeat(80));
    console.log(JSON.stringify(usersData, null, 2));
    console.log('=' .repeat(80));

    // Also try to save to file (if possible)
    try {
      const filename = `railway-users-backup-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(usersData, null, 2));
      console.log(`\n✅ Also saved to file: ${filename}`);
    } catch (fileError) {
      console.log('\n⚠️  Could not save to file, but JSON is printed above');
    }

    console.log(`\n🎯 Summary:`);
    console.log(`- Total users: ${users.length}`);
    console.log(`- Active users: ${users.filter(u => u.is_active).length}`);
    console.log(`- Inactive users: ${users.filter(u => !u.is_active).length}`);

  } catch (error) {
    console.error('❌ Error extracting users:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the extraction
extractUsersForRailway();
