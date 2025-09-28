#!/usr/bin/env node

const { Game, Question, User, GamePlayer } = require('../models');
const gameService = require('../services/gameService');
const testUsersConfig = require('../config/testUsers');

async function createTestGame() {
  try {
    console.log('🎮 Creating test game for safe testing...\n');
    
    // Create test users if they don't exist (from central config)
    const testUsers = testUsersConfig.testUsers;
    
    console.log('👥 Creating/updating test users...');
    for (const userData of testUsers) {
      await User.findOrCreate({
        where: { whatsapp_number: userData.whatsapp_number },
        defaults: {
          nickname: userData.nickname,
          is_active: true,
          registration_completed: true,
          last_activity: new Date()
        }
      });
    }
    
    // Create test game
    console.log('🎯 Creating test game...');
    const game = await Game.create({
      status: 'scheduled',
      prize_pool: 10.00,
      start_time: new Date(Date.now() + 10000), // Start in 10 seconds
      total_questions: 3
    });
    
    // Add test questions
    const questions = [
      {
        game_id: game.id,
        question_text: 'What is the capital of France?',
        option_a: 'London',
        option_b: 'Berlin',
        option_c: 'Paris',
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
    ];
    
    await Question.bulkCreate(questions);
    console.log('✅ Test questions created');
    
    // Register only test users for the game
    console.log('📝 Registering test users for game...');
    for (const userData of testUsers) {
      const user = await User.findOne({ where: { whatsapp_number: userData.whatsapp_number } });
      if (user) {
        await GamePlayer.create({
          game_id: game.id,
          user_id: user.id,
          status: 'alive',
          joined_at: new Date()
        });
      }
    }
    
    console.log(`✅ Test game created with ID: ${game.id}`);
    console.log(`🎮 Game starts in 10 seconds`);
    console.log(`👥 Only test users will receive notifications`);
    console.log(`🔒 Production users are safe (development mode blocks messages)`);
    
    // Start the game
    setTimeout(async () => {
      console.log('🚀 Starting test game...');
      await gameService.startGame(game.id);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error creating test game:', error);
  }
}

// Run the test game creation
createTestGame().catch(console.error);
