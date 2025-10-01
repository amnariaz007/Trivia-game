#!/usr/bin/env node

/**
 * Local Development Setup Script
 * Sets up local database and environment for development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up local development environment...');

// Create .env file for local development
const envContent = `# Local Development Configuration
NODE_ENV=development
PORT=3000

# Local Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/qrush_trivia_local

# Local Redis Configuration  
REDIS_URL=redis://localhost:6379

# WhatsApp API (use production values for testing)
WHATSAPP_ACCESS_TOKEN=your_production_token_here
WHATSAPP_PHONE_NUMBER_ID=your_production_phone_id_here
WHATSAPP_VERIFY_TOKEN=your_production_verify_token_here
WHATSAPP_API_VERSION=v18.0

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Game Configuration
DEFAULT_PRIZE_POOL=100
QUESTION_TIMER=10
MAX_PLAYERS=100
`;

try {
  // Write .env file
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log('✅ Created .env file for local development');
  
  // Create local database
  console.log('🗄️  Creating local database...');
  try {
    execSync('createdb qrush_trivia_local', { stdio: 'inherit' });
    console.log('✅ Local database created');
  } catch (error) {
    console.log('⚠️  Database might already exist or PostgreSQL not running');
  }
  
  // Initialize database tables
  console.log('🔧 Initializing database tables...');
  try {
    execSync('node scripts/init-db.js', { stdio: 'inherit' });
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.log('⚠️  Database initialization failed:', error.message);
  }
  
  console.log('\n🎉 Local development setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Update .env file with your production WhatsApp tokens');
  console.log('2. Start Redis: redis-server');
  console.log('3. Start backend: npm run dev');
  console.log('4. Start frontend: cd ../frontend && npm run dev');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
