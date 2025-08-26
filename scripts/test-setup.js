const { User, Game, Question, GamePlayer } = require('../models');
const { sequelize } = require('../config/database');

async function setupTestData() {
  try {
    console.log('🧪 Setting up test data...');

    // Create test users
    const testUsers = [
      { whatsapp_number: '+1234567890', nickname: 'TestUser1' },
      { whatsapp_number: '+1234567891', nickname: 'TestUser2' },
      { whatsapp_number: '+1234567892', nickname: 'TestUser3' }
    ];

    for (const userData of testUsers) {
      const [user, created] = await User.findOrCreate({
        where: { whatsapp_number: userData.whatsapp_number },
        defaults: {
          ...userData,
          registration_completed: true,
          is_active: true
        }
      });
      
      if (created) {
        console.log(`✅ Created test user: ${userData.nickname}`);
      } else {
        console.log(`ℹ️  Test user already exists: ${userData.nickname}`);
      }
    }

    // Create a test game
    const testGame = await Game.create({
      start_time: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      prize_pool: 100.00,
      total_questions: 5,
      status: 'scheduled'
    });

    console.log(`✅ Created test game: ${testGame.id}`);

    // Create test questions
    const testQuestions = [
      {
        question_text: "What is the capital of France?",
        option_a: "London",
        option_b: "Paris",
        option_c: "Berlin",
        option_d: "Madrid",
        correct_answer: "Paris"
      },
      {
        question_text: "Which planet is known as the Red Planet?",
        option_a: "Venus",
        option_b: "Mars",
        option_c: "Jupiter",
        option_d: "Saturn",
        correct_answer: "Mars"
      },
      {
        question_text: "What is 2 + 2?",
        option_a: "3",
        option_b: "4",
        option_c: "5",
        option_d: "6",
        correct_answer: "4"
      },
      {
        question_text: "Who wrote Romeo and Juliet?",
        option_a: "Charles Dickens",
        option_b: "William Shakespeare",
        option_c: "Jane Austen",
        option_d: "Mark Twain",
        correct_answer: "William Shakespeare"
      },
      {
        question_text: "What is the largest ocean on Earth?",
        option_a: "Atlantic Ocean",
        option_b: "Indian Ocean",
        option_c: "Arctic Ocean",
        option_d: "Pacific Ocean",
        correct_answer: "Pacific Ocean"
      }
    ];

    for (let i = 0; i < testQuestions.length; i++) {
      const question = await Question.create({
        game_id: testGame.id,
        question_text: testQuestions[i].question_text,
        option_a: testQuestions[i].option_a,
        option_b: testQuestions[i].option_b,
        option_c: testQuestions[i].option_c,
        option_d: testQuestions[i].option_d,
        correct_answer: testQuestions[i].correct_answer,
        question_order: i + 1
      });
    }

    console.log(`✅ Created ${testQuestions.length} test questions`);

    // Register test users for the game
    const users = await User.findAll();
    for (const user of users) {
      await GamePlayer.create({
        game_id: testGame.id,
        user_id: user.id,
        status: 'registered'
      });
    }

    console.log(`✅ Registered ${users.length} users for test game`);

    console.log('\n🎉 Test setup completed!');
    console.log(`📊 Test Game ID: ${testGame.id}`);
    console.log(`👥 Test Users: ${users.length}`);
    console.log(`❓ Questions: ${testQuestions.length}`);
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Access admin dashboard: http://localhost:3000/admin.html');
    console.log('3. Start registration for the test game');
    console.log('4. Test WhatsApp webhook with test messages');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
setupTestData();
