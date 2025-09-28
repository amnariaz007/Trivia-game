#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Safe Testing Workflow for WhatsApp Trivia\n');
console.log('This workflow allows you to test games without affecting production users.\n');

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'backup':
    console.log('💾 Step 1: Backing up production users...');
    execSync('node scripts/backup-production-users.js', { stdio: 'inherit' });
    break;
    
  case 'remove':
    console.log('🗑️  Step 2: Removing production users...');
    execSync('node scripts/remove-production-users.js', { stdio: 'inherit' });
    break;
    
  case 'test-users':
    console.log('🧪 Step 3: Creating test users...');
    execSync('node scripts/create-test-users.js', { stdio: 'inherit' });
    break;
    
  case 'restore':
    console.log('🔄 Step 4: Restoring production users...');
    execSync('node scripts/restore-production-users.js', { stdio: 'inherit' });
    break;
    
  case 'full-setup':
    console.log('🚀 Full testing setup...');
    execSync('node scripts/backup-production-users.js', { stdio: 'inherit' });
    execSync('node scripts/remove-production-users.js', { stdio: 'inherit' });
    execSync('node scripts/create-test-users.js', { stdio: 'inherit' });
    console.log('\n✅ Testing setup complete!');
    console.log('🧪 You can now test games safely with fake users');
    break;
    
  case 'cleanup':
    console.log('🧹 Cleaning up test data...');
    execSync('node scripts/restore-production-users.js', { stdio: 'inherit' });
    console.log('\n✅ Production users restored!');
    break;
    
  default:
    console.log('📋 Available commands:');
    console.log('  backup      - Backup production users');
    console.log('  remove      - Remove production users');
    console.log('  test-users  - Create test users');
    console.log('  restore     - Restore production users');
    console.log('  full-setup  - Complete testing setup (backup + remove + test-users)');
    console.log('  cleanup     - Restore production users (cleanup)');
    console.log('\n🚀 Recommended workflow:');
    console.log('  1. node scripts/safe-testing-workflow.js full-setup');
    console.log('  2. Test your games with fake users');
    console.log('  3. node scripts/safe-testing-workflow.js cleanup');
    console.log('\n💡 This keeps your 93 production users safe during testing!');
}
