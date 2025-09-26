#!/usr/bin/env node

require('dotenv').config();
const { Game, User, Question, GamePlayer } = require('../models');
const gameService = require('../services/gameService');
const queueService = require('../services/queueService');
const notificationService = require('../services/notificationService');
const whatsappService = require('../services/whatsappService');

class CompleteWhatsAppTester {
  constructor() {
    this.testUsers = [];
    this.testGame = null;
    this.testQuestions = [];
  }

  async setupTestData() {
    console.log('🔧 Setting up test data for WhatsApp flow...\n');

    // Create test users with real WhatsApp numbers
    const testUserData = [
      { nickname: 'TestPlayer1', whatsapp_number: '923196612416' } // Only using 03196612416
    ];

    for (const userData of testUserData) {
      const [user, created] = await User.findOrCreate({
        where: { whatsapp_number: userData.whatsapp_number },
        defaults: userData
      });
      this.testUsers.push(user);
      console.log(`👤 ${created ? 'Created' : 'Found'} user: ${user.nickname} (${user.whatsapp_number})`);
    }

    console.log('\n✅ Test data setup complete!\n');
  }

  async createTestGame() {
    console.log('🎮 Creating test game with WhatsApp integration...\n');

    // Create a game starting in 2 minutes for quick testing
    const startTime = new Date(Date.now() + 2 * 60 * 1000);

    this.testGame = await Game.create({
      status: 'scheduled',
      prize_pool: 25.00,
      start_time: startTime,
      total_questions: 3,
      game_config: {
        questionTimer: 10,
        maxPlayers: 100,
        eliminationMode: 'sudden_death'
      }
    });

    // Create test questions
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

    // Schedule reminders for the test game
    await notificationService.scheduleGameReminders(this.testGame.id);

    console.log(`✅ Created game: ${this.testGame.id}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}`);
    console.log(`⏰ Start time: ${this.testGame.start_time.toLocaleString()}`);
    console.log(`❓ Questions: ${this.testQuestions.length}`);
    console.log(`🔔 Reminders scheduled for 30min and 5min before start\n`);

    return this.testGame;
  }

  async testPlayerRegistration() {
    console.log('👥 Testing player registration via WhatsApp...\n');

    for (const user of this.testUsers) {
      // Simulate player joining the game
      const gamePlayer = await GamePlayer.create({
        game_id: this.testGame.id,
        user_id: user.id,
        status: 'alive'
      });

      // Send registration confirmation via WhatsApp
      await whatsappService.sendTextMessage(
        user.whatsapp_number,
        `🎉 You're registered for QRush Trivia!

⏰ Game starts at: ${this.testGame.start_time.toLocaleString()}
💰 Prize pool: $${this.testGame.prize_pool}

We'll send you a reminder 5 minutes before the game starts!`
      );

      console.log(`✅ Registered ${user.nickname} and sent confirmation via WhatsApp`);
    }

    // Update game player count
    await this.testGame.updatePlayerCount(this.testUsers.length);
    console.log(`\n✅ Registered ${this.testUsers.length} players for the game\n`);
  }

  async testGameAnnouncement() {
    console.log('📢 Testing game announcement...\n');

    // Send game announcement to all users
    await notificationService.sendGameAnnouncement(this.testGame.id);
    console.log('✅ Game announcement sent to all users\n');
  }

  async testReminders() {
    console.log('🔔 Testing reminder system...\n');

    // Test sending manual reminders
    for (const user of this.testUsers) {
      await whatsappService.sendTextMessage(
        user.whatsapp_number,
        `🔔 QRush Trivia Reminder!

Game starts in 30 minutes!

💰 Prize pool: $${this.testGame.prize_pool}
⏰ Start time: ${this.testGame.start_time.toLocaleString()}

Get ready for sudden-death questions!`
      );
      console.log(`✅ Sent 30-minute reminder to ${user.nickname}`);
    }

    console.log('\n⏳ Waiting 30 seconds before 5-minute reminder...');
    await this.sleep(30000);

    for (const user of this.testUsers) {
      await whatsappService.sendTextMessage(
        user.whatsapp_number,
        `🚨 QRush Trivia starts in 5 minutes!

💰 Prize pool: $${this.testGame.prize_pool}
⏰ Get ready - questions are coming!

Make sure you're available to play!`
      );
      console.log(`✅ Sent 5-minute reminder to ${user.nickname}`);
    }

    console.log('\n✅ Reminder testing complete!\n');
  }

  async testGameStart() {
    console.log('🚀 Testing game start with WhatsApp messaging...\n');

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

      // Wait for game start messages to be sent
      await this.sleep(3000);
      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  async testQuestionFlow() {
    console.log('❓ Testing question flow with WhatsApp...\n');

    // Wait for first question to be sent
    await this.sleep(6000);

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('❌ Game state not found - game may have ended');
      return;
    }

    console.log(`📊 Current game state:`);
    console.log(`   Current question: ${gameState.currentQuestion + 1}`);
    console.log(`   Alive players: ${gameState.players.filter(p => p.status === 'alive').length}`);
    console.log(`   Eliminated players: ${gameState.players.filter(p => p.status === 'eliminated').length}`);

    // Test sending answers
    console.log('\n🎯 Testing player answers...');
    
    // Simulate different answer scenarios
    const answerScenarios = [
      { playerIndex: 0, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'London', shouldBeCorrect: false },
      { playerIndex: 2, answer: 'Paris', shouldBeCorrect: true }
    ];

    for (const scenario of answerScenarios) {
      const player = gameState.players[scenario.playerIndex];
      if (!player) continue;

      console.log(`👤 Testing ${player.user.nickname}:`);
      console.log(`   Answer: ${scenario.answer}`);
      console.log(`   Expected: ${scenario.shouldBeCorrect ? 'Correct' : 'Incorrect/Eliminated'}`);

      try {
        await gameService.handlePlayerAnswer(
          this.testGame.id,
          player.user.whatsapp_number,
          scenario.answer
        );
        console.log(`   ✅ Answer processed via WhatsApp`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      await this.sleep(2000); // Wait between answers
    }

    console.log('\n✅ Question flow testing complete!\n');
  }

  async testGameEnd() {
    console.log('🏁 Testing game end and winner notifications...\n');

    // Wait for game to complete
    await this.sleep(10000);

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('✅ Game has ended successfully');
      
      // Test winner notifications
      const winners = await GamePlayer.findAll({
        where: { 
          game_id: this.testGame.id,
          status: 'winner'
        },
        include: [{ model: User, as: 'user' }]
      });

      if (winners.length > 0) {
        console.log(`🏆 Found ${winners.length} winners, sending notifications...`);
        await notificationService.sendWinnerNotifications(
          this.testGame.id,
          winners.map(w => w.user),
          this.testGame.prize_pool,
          this.testGame.prize_pool / winners.length
        );
        console.log('✅ Winner notifications sent via WhatsApp');
      }
    }

    console.log('\n✅ Game end testing complete!\n');
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

  async runCompleteTest() {
    console.log('🎮 Starting Complete WhatsApp Game Flow Test\n');
    console.log('=' .repeat(60));

    try {
      // Setup
      await this.setupTestData();
      await this.createTestGame();
      await this.testPlayerRegistration();
      await this.testGameAnnouncement();
      await this.testReminders();
      await this.testGameStart();
      await this.testQuestionFlow();
      await this.testGameEnd();

      console.log('=' .repeat(60));
      console.log('🎉 Complete WhatsApp Game Flow Test Completed Successfully!\n');

      // Wait a bit before cleanup to see final results
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
  const tester = new CompleteWhatsAppTester();
  await tester.runCompleteTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteWhatsAppTester;
