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
    
    // Check if we need to create sample data
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('📝 No users found, creating sample data...');
      await createSampleData();
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping sample data creation`);
    }
    
    console.log('✅ Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

async function createSampleData() {
  try {
    console.log('📝 Creating sample data...');
    
    // Create admin user
    const adminUser = await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    console.log('✅ Admin user created');
    
    // Create sample questions
    const sampleQuestions = [
      {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        difficulty: 'easy',
        category: 'Geography'
      },
      {
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Science'
      },
      {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1,
        difficulty: 'easy',
        category: 'Math'
      }
    ];
    
    for (const questionData of sampleQuestions) {
      await Question.create(questionData);
    }
    console.log('✅ Sample questions created');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
