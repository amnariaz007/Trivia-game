#!/usr/bin/env node

/**
 * Quick user count check
 * This will work with your local database to verify user count
 */

const { User } = require('../models');

async function checkUserCount() {
  try {
    console.log('🔍 Checking user count in local database...');
    
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const inactiveUsers = await User.count({ where: { is_active: false } });

    console.log(`📊 User Statistics:`);
    console.log(`- Total users: ${totalUsers}`);
    console.log(`- Active users: ${activeUsers}`);
    console.log(`- Inactive users: ${inactiveUsers}`);

    // Show sample users
    const sampleUsers = await User.findAll({
      attributes: ['nickname', 'whatsapp_number', 'is_active'],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    console.log(`\n📋 Sample users (latest 5):`);
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    process.exit(0);
  }
}

checkUserCount();
