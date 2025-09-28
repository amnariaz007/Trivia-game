#!/usr/bin/env node

require('dotenv').config();
const { Game, User, Question, GamePlayer } = require('../models');
const gameService = require('../services/gameService');
const queueService = require('../services/queueService');
const notificationService = require('../services/notificationService');
const whatsappService = require('../services/whatsappService');

class CleanGameTester {
  constructor() {
    this.testUsers = [];
    this.testGame = null;
    this.testQuestions = [];
  }

  async setupTestUsers() {
    console.log('👥 Setting up test users...\n');

    // Create test users
    const testUserData = [
      { nickname: 'TestUser', whatsapp_number: '923196612416' } // Only using 03196612416
    ];

    for (const userData of testUserData) {
      const [user, created] = await User.findOrCreate({
        where: { whatsapp_number: userData.whatsapp_number },
        defaults: userData
      });
      this.testUsers.push(user);
      console.log(`👤 ${created ? 'Created' : 'Found'} user: ${user.nickname} (${user.whatsapp_number})`);
    }

    console.log(`\n✅ Created ${this.testUsers.length} test users!\n`);
  }

  async createCleanTestGame() {
    console.log('🎮 Creating clean test game...\n');

    // Create a game starting in 2 minutes
    const startTime = new Date(Date.now() + 2 * 60 * 1000);

    this.testGame = await Game.create({
      status: 'scheduled',
      prize_pool: 50.00,
      start_time: startTime,
      total_questions: 3,
      game_config: {
        questionTimer: 15,
        maxPlayers: 100,
        eliminationMode: 'sudden_death'
      }
    });

    // Create simple test questions
    const testQuestionData = [
      {
        game_id: this.testGame.id,
        question_text: 'What is the capital of France?',
        option_a: 'London',
        option_b: 'Paris',
        option_c: 'Berlin',
        option_d: 'Madrid',
        correct_answer: 'Paris',
        difficulty: 'easy',
        category: 'geography',
        question_order: 1
      },
      {
        game_id: this.testGame.id,
        question_text: 'Which planet is known as the Red Planet?',
        option_a: 'Venus',
        option_b: 'Mars',
        option_c: 'Jupiter',
        option_d: 'Saturn',
        correct_answer: 'Mars',
        difficulty: 'easy',
        category: 'science',
        question_order: 2
      },
      {
        game_id: this.testGame.id,
        question_text: 'What is 2 + 2?',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        correct_answer: '4',
        difficulty: 'easy',
        category: 'math',
        question_order: 3
      }
    ];

    for (const questionData of testQuestionData) {
      const question = await Question.create(questionData);
      this.testQuestions.push(question);
      console.log(`❓ Created question: ${question.question_text}`);
    }

    // Schedule reminders
    await notificationService.scheduleGameReminders(this.testGame.id);

    console.log(`\n✅ Created clean test game: ${this.testGame.id}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}`);
    console.log(`⏰ Start time: ${this.testGame.start_time.toLocaleString()}`);
    console.log(`❓ Questions: ${this.testQuestions.length}\n`);

    return this.testGame;
  }

  async registerTestUsers() {
    console.log('📱 Registering test users...\n');

    for (const user of this.testUsers) {
      // Create game player
      const gamePlayer = await GamePlayer.create({
        game_id: this.testGame.id,
        user_id: user.id,
        status: 'alive'
      });

      // Send registration confirmation
      await whatsappService.sendTextMessage(
        user.whatsapp_number,
        `🎉 Welcome to QRush Trivia, ${user.nickname}!

⏰ Game starts at: ${this.testGame.start_time.toLocaleString()}
💰 Prize pool: $${this.testGame.prize_pool}
❓ Questions: ${this.testQuestions.length}

Get ready for sudden-death questions!`
      );

      console.log(`✅ Registered ${user.nickname}`);
      await this.sleep(1000);
    }

    // Update game player count
    await this.testGame.updatePlayerCount(this.testUsers.length);
    console.log(`\n✅ All ${this.testUsers.length} users registered!\n`);
  }

  async startGameAndTest() {
    console.log('🚀 Starting game and testing flow...\n');

    try {
      // Start the game
      const gameState = await gameService.startGame(this.testGame.id);
      console.log('✅ Game started successfully!');
      console.log(`📊 Game state:`, {
        gameId: gameState.gameId,
        currentQuestion: gameState.currentQuestion,
        playersCount: gameState.players.length,
        questionsCount: gameState.questions.length
      });

      // Wait for first question to be sent
      await this.sleep(8000);

      // Test answering questions
      await this.testQuestionAnswers();

      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  async testQuestionAnswers() {
    console.log('❓ Testing question answers...\n');

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('❌ Game state not found');
      return;
    }

    // Test different answer scenarios
    const answerScenarios = [
      // Question 1: All get it right
      { playerIndex: 0, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 2, answer: 'Paris', shouldBeCorrect: true },
      
      // Question 2: One gets eliminated
      { playerIndex: 0, answer: 'Mars', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Venus', shouldBeCorrect: false },
      { playerIndex: 2, answer: 'Mars', shouldBeCorrect: true },
      
      // Question 3: Final question
      { playerIndex: 0, answer: '4', shouldBeCorrect: true },
      { playerIndex: 1, answer: '4', shouldBeCorrect: true },
      { playerIndex: 2, answer: '4', shouldBeCorrect: true }
    ];

    for (let questionNum = 0; questionNum < 3; questionNum++) {
      console.log(`\n🎯 Question ${questionNum + 1}:`);
      
      // Get answers for this question
      const questionAnswers = answerScenarios.slice(questionNum * 3, (questionNum + 1) * 3);
      
      for (const scenario of questionAnswers) {
        const player = gameState.players[scenario.playerIndex];
        if (!player || player.status !== 'alive') continue;

        console.log(`👤 ${player.user.nickname}: ${scenario.answer} (${scenario.shouldBeCorrect ? 'Correct' : 'Wrong'})`);

        try {
          await gameService.handlePlayerAnswer(
            this.testGame.id,
            player.user.whatsapp_number,
            scenario.answer
          );
          console.log(`   ✅ Answer processed`);
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }

        await this.sleep(2000);
      }

      // Wait for question to complete
      await this.sleep(8000);
      
      console.log(`📊 After Question ${questionNum + 1}:`);
      console.log(`   Alive: ${gameState.players.filter(p => p.status === 'alive').length}`);
      console.log(`   Eliminated: ${gameState.players.filter(p => p.status === 'eliminated').length}`);
    }

    console.log('\n✅ Question testing complete!\n');
  }

  async checkGameResults() {
    console.log('🏁 Checking game results...\n');

    // Wait for game to complete
    await this.sleep(10000);

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('✅ Game has ended successfully');
      
      // Check winners
      const winners = await GamePlayer.findAll({
        where: { 
          game_id: this.testGame.id,
          status: 'winner'
        },
        include: [{ model: User, as: 'user' }]
      });

      if (winners.length > 0) {
        console.log(`🏆 Found ${winners.length} winners:`);
        for (const winner of winners) {
          console.log(`   - ${winner.user.nickname} (${winner.user.whatsapp_number})`);
        }
      } else {
        console.log('❌ No winners found');
      }
    }

    console.log('\n✅ Game results checked!\n');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...\n');

    try {
      // Clean up game players
      await GamePlayer.destroy({
        where: { game_id: this.testGame.id }
      });

      // Clean up game
      await this.testGame.destroy();

      // Clean up questions
      for (const question of this.testQuestions) {
        await question.destroy();
      }

      // Clean up users
      for (const user of this.testUsers) {
        await user.destroy();
      }

      console.log('✅ Cleanup complete!\n');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  async runCleanTest() {
    console.log('🎮 Starting Clean Game Test\n');
    console.log('=' .repeat(60));

    try {
      await this.setupTestUsers();
      await this.createCleanTestGame();
      await this.registerTestUsers();
      await this.startGameAndTest();
      await this.checkGameResults();

      console.log('=' .repeat(60));
      console.log('🎉 Clean Game Test Completed Successfully!\n');

      // Wait before cleanup
      console.log('⏳ Waiting 10 seconds before cleanup...');
      await this.sleep(10000);

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
async function main() {
  const tester = new CleanGameTester();
  await tester.runCleanTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CleanGameTester;
