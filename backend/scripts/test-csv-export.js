const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');
const { sequelize } = require('../config/database');

async function createTestGameWithAnswers() {
  try {
    console.log('🔄 Creating test game with answers for CSV export...');
    
    // Create test users if they don't exist
    const [user1] = await User.findOrCreate({
      where: { whatsapp_number: '1234567890' },
      defaults: { nickname: 'TestUser1' }
    });
    
    const [user2] = await User.findOrCreate({
      where: { whatsapp_number: '0987654321' },
      defaults: { nickname: 'TestUser2' }
    });
    
    // Create a finished game
    const game = await Game.create({
      status: 'finished',
      start_time: new Date(Date.now() - 3600000), // 1 hour ago
      end_time: new Date(),
      prize_pool: 100.00,
      winner_count: 1,
      total_players: 2,
      current_question: 3,
      total_questions: 3,
      game_config: {
        maxPlayers: 100,
        questionTimer: 10,
        eliminationMode: 'sudden_death'
      }
    });
    
    // Create questions
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
        question_text: 'What is 2 + 2?',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        correct_answer: '4',
        question_order: 3
      }
    ]);
    
    // Create game players
    const gamePlayers = await GamePlayer.bulkCreate([
      {
        game_id: game.id,
        user_id: user1.id,
        status: 'winner'
      },
      {
        game_id: game.id,
        user_id: user2.id,
        status: 'eliminated'
      }
    ]);
    
    // Create player answers
    await PlayerAnswer.bulkCreate([
      // User 1 - Winner (all correct)
      {
        game_id: game.id,
        user_id: user1.id,
        question_id: questions[0].id,
        selected_answer: 'Paris',
        is_correct: true,
        response_time_ms: 5000,
        question_number: 1
      },
      {
        game_id: game.id,
        user_id: user1.id,
        question_id: questions[1].id,
        selected_answer: 'Mars',
        is_correct: true,
        response_time_ms: 3000,
        question_number: 2
      },
      {
        game_id: game.id,
        user_id: user1.id,
        question_id: questions[2].id,
        selected_answer: '4',
        is_correct: true,
        response_time_ms: 2000,
        question_number: 3
      },
      // User 2 - Eliminated (wrong on question 2)
      {
        game_id: game.id,
        user_id: user2.id,
        question_id: questions[0].id,
        selected_answer: 'Paris',
        is_correct: true,
        response_time_ms: 7000,
        question_number: 1
      },
      {
        game_id: game.id,
        user_id: user2.id,
        question_id: questions[1].id,
        selected_answer: 'Venus',
        is_correct: false,
        response_time_ms: 8000,
        question_number: 2
      }
    ]);
    
    console.log('✅ Test game created successfully!');
    console.log(`📊 Game ID: ${game.id}`);
    console.log(`👥 Players: ${gamePlayers.length}`);
    console.log(`❓ Questions: ${questions.length}`);
    console.log(`🏆 Winner: ${user1.nickname}`);
    console.log(`💀 Eliminated: ${user2.nickname}`);
    console.log('\n🔗 Test CSV export with:');
    console.log(`curl -H "username: admin" -H "password: test123" http://localhost:3000/admin/games/${game.id}/export`);
    
  } catch (error) {
    console.error('❌ Error creating test game:', error);
  } finally {
    await sequelize.close();
  }
}

createTestGameWithAnswers();
