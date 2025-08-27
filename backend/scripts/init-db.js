const { sequelize, testConnection } = require('../config/database');
const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection
    await testConnection();
    
    // Sync all models (create tables)
    console.log('📋 Creating database tables...');
    await sequelize.sync({ force: true }); // force: true will drop existing tables
    
    console.log('✅ Database tables created successfully');
    
    // Create sample data
    await createSampleData();
    
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
    
    // Create sample users
    const users = await User.bulkCreate([
      {
        whatsapp_number: '1234567890',
        nickname: 'TestUser1',
        registration_completed: true
      },
      {
        whatsapp_number: '0987654321',
        nickname: 'TestUser2',
        registration_completed: true
      }
    ]);
    
    console.log(`✅ Created ${users.length} sample users`);
    
    // Create sample game
    const game = await Game.create({
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      prize_pool: 100.00,
      total_questions: 10,
      status: 'scheduled'
    });
    
    console.log('✅ Created sample game');
    
    // Create sample questions
    const questions = await Question.bulkCreate([
      {
        game_id: game.id,
        question_text: 'What is the capital of France?',
        option_a: 'London',
        option_b: 'Paris',
        option_c: 'Berlin',
        option_d: 'Madrid',
        correct_answer: 'Paris',
        question_order: 1
      },
      {
        game_id: game.id,
        question_text: 'Which planet is known as the Red Planet?',
        option_a: 'Venus',
        option_b: 'Mars',
        option_c: 'Jupiter',
        option_d: 'Saturn',
        correct_answer: 'Mars',
        question_order: 2
      },
      {
        game_id: game.id,
        question_text: 'What is the largest ocean on Earth?',
        option_a: 'Atlantic Ocean',
        option_b: 'Indian Ocean',
        option_c: 'Pacific Ocean',
        option_d: 'Arctic Ocean',
        correct_answer: 'Pacific Ocean',
        question_order: 3
      },
      {
        game_id: game.id,
        question_text: 'Who wrote "Romeo and Juliet"?',
        option_a: 'Charles Dickens',
        option_b: 'William Shakespeare',
        option_c: 'Jane Austen',
        option_d: 'Mark Twain',
        correct_answer: 'William Shakespeare',
        question_order: 4
      },
      {
        game_id: game.id,
        question_text: 'What is the chemical symbol for gold?',
        option_a: 'Ag',
        option_b: 'Au',
        option_c: 'Fe',
        option_d: 'Cu',
        correct_answer: 'Au',
        question_order: 5
      }
    ]);
    
    console.log(`✅ Created ${questions.length} sample questions`);
    
    // Create sample game players
    const gamePlayers = await GamePlayer.bulkCreate([
      {
        game_id: game.id,
        user_id: users[0].id,
        status: 'alive'
      },
      {
        game_id: game.id,
        user_id: users[1].id,
        status: 'alive'
      }
    ]);
    
    console.log(`✅ Created ${gamePlayers.length} sample game players`);
    
    console.log('🎉 Sample data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
