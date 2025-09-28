#!/usr/bin/env node

/**
 * Fetch users from backend API and save to file
 * This is the shortest way to extract users - using the same API the frontend uses
 */

const fs = require('fs');
const path = require('path');

async function fetchUsersFromAPI() {
  try {
    console.log('🔍 Fetching users from backend API...');
    
    // Use the production backend URL
    const apiUrl = 'https://ingenious-abundance-production.up.railway.app';
    const endpoint = '/admin/users';
    
    // Make API request (same as frontend)
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'username': 'admin',
        'password': 'admin123'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const users = await response.json();
    
    console.log(`📊 Fetched ${users.length} users from production API`);

    // Prepare data for export
    const usersData = {
      extracted_at: new Date().toISOString(),
      source: 'production_api',
      total_users: users.length,
      users: users
    };

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `production-users-from-api-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(usersData, null, 2));

    console.log(`✅ Successfully extracted ${users.length} users`);
    console.log(`📁 Saved to: ${filepath}`);
    console.log(`📊 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    // Show sample of extracted data
    console.log('\n📋 Sample of extracted users:');
    users.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname} (${user.whatsapp_number}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    if (users.length > 5) {
      console.log(`... and ${users.length - 5} more users`);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Users are safely backed up from production API');
    console.log('2. You can now test with test users');
    console.log('3. Use restore script to bring them back when needed');

  } catch (error) {
    console.error('❌ Error fetching users from API:', error);
    console.log('\n💡 Alternative: You can also:');
    console.log('1. Open the frontend dashboard');
    console.log('2. Go to Users section');
    console.log('3. Open browser dev tools (F12)');
    console.log('4. Go to Network tab');
    console.log('5. Refresh the page');
    console.log('6. Find the /admin/users request');
    console.log('7. Copy the response JSON');
    process.exit(1);
  }
}

// Run the extraction
fetchUsersFromAPI();
