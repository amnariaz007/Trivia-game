const { sequelize, testConnection } = require('../config/database');
const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database for production...');
    
    // Test connection
    await testConnection();
    
    // Sync all models (create tables if they don't exist)
    console.log('📋 Creating database tables if they don\'t exist...');
    await sequelize.sync({ force: false }); // force: false will only create tables if they don't exist
    
    console.log('✅ Database tables ready');
    console.log('✅ Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
