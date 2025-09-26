#!/usr/bin/env node

require('dotenv').config();
const { Game, User, Question, GamePlayer } = require('../models');
const gameService = require('../services/gameService');
const queueService = require('../services/queueService');
const notificationService = require('../services/notificationService');
const whatsappService = require('../services/whatsappService');

class MultiUserSimulator {
  constructor() {
    this.testUsers = [];
    this.testGame = null;
    this.testQuestions = [];
  }

  async setupTestUsers() {
    console.log('👥 Setting up multiple test users...\n');

    // Create test users with different phone numbers
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

  async createTestGame() {
    console.log('🎮 Creating test game for multi-user testing...\n');

    // Create a game starting in 1 minute for quick testing
    const startTime = new Date(Date.now() + 1 * 60 * 1000);

    this.testGame = await Game.create({
      status: 'scheduled',
      prize_pool: 50.00,
      start_time: startTime,
      total_questions: 5,
      game_config: {
        questionTimer: 15,
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
      },
      {
        game_id: this.testGame.id,
        question_text: 'Who painted the Mona Lisa?',
        option_a: 'Van Gogh',
        option_b: 'Picasso',
        option_c: 'Da Vinci',
        option_d: 'Michelangelo',
        correct_answer: 'Da Vinci',
        difficulty: 'medium',
        category: 'art',
        question_order: 4
      },
      {
        game_id: this.testGame.id,
        question_text: 'What is the largest ocean?',
        option_a: 'Atlantic',
        option_b: 'Pacific',
        option_c: 'Indian',
        option_d: 'Arctic',
        correct_answer: 'Pacific',
        difficulty: 'easy',
        category: 'geography',
        question_order: 5
      }
    ];

    for (const questionData of testQuestionData) {
      const question = await Question.create(questionData);
      this.testQuestions.push(question);
      console.log(`❓ Created question: ${question.question_text}`);
    }

    // Schedule reminders
    await notificationService.scheduleGameReminders(this.testGame.id);

    console.log(`\n✅ Created game: ${this.testGame.id}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}`);
    console.log(`⏰ Start time: ${this.testGame.start_time.toLocaleString()}`);
    console.log(`❓ Questions: ${this.testQuestions.length}`);
    console.log(`👥 Max players: ${this.testGame.game_config.maxPlayers}\n`);

    return this.testGame;
  }

  async simulateUserRegistration() {
    console.log('📱 Simulating user registration via WhatsApp...\n');

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
👥 Players registered: ${this.testUsers.length}

Get ready for sudden-death questions!`
      );

      console.log(`✅ Registered ${user.nickname} and sent confirmation`);
      await this.sleep(1000); // Wait 1 second between registrations
    }

    // Update game player count
    await this.testGame.updatePlayerCount(this.testUsers.length);
    console.log(`\n✅ All ${this.testUsers.length} users registered!\n`);
  }

  async simulateGameStart() {
    console.log('🚀 Starting the game...\n');

    try {
      const gameState = await gameService.startGame(this.testGame.id);
      console.log('✅ Game started successfully!');
      console.log(`📊 Game state:`, {
        gameId: gameState.gameId,
        currentQuestion: gameState.currentQuestion,
        playersCount: gameState.players.length,
        questionsCount: gameState.questions.length
      });

      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  async simulateQuestionFlow() {
    console.log('❓ Simulating question flow with multiple users...\n');

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('❌ Game state not found');
      return;
    }

    // Wait for first question to be sent
    await this.sleep(5000);

    console.log(`📊 Current game state:`);
    console.log(`   Current question: ${gameState.currentQuestion + 1}`);
    console.log(`   Alive players: ${gameState.players.filter(p => p.status === 'alive').length}`);
    console.log(`   Eliminated players: ${gameState.players.filter(p => p.status === 'eliminated').length}`);

    // Simulate different answer scenarios for each question
    const answerScenarios = [
      // Question 1: Most get it right
      { playerIndex: 0, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 2, answer: 'London', shouldBeCorrect: false },
      { playerIndex: 3, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 4, answer: 'Paris', shouldBeCorrect: true },
      
      // Question 2: Some get eliminated
      { playerIndex: 0, answer: 'Mars', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Venus', shouldBeCorrect: false },
      { playerIndex: 2, answer: 'Mars', shouldBeCorrect: true },
      { playerIndex: 3, answer: 'Mars', shouldBeCorrect: true },
      { playerIndex: 4, answer: 'Mars', shouldBeCorrect: true },
      
      // Question 3: More eliminations
      { playerIndex: 0, answer: '4', shouldBeCorrect: true },
      { playerIndex: 1, answer: '4', shouldBeCorrect: true },
      { playerIndex: 2, answer: '4', shouldBeCorrect: true },
      { playerIndex: 3, answer: '5', shouldBeCorrect: false },
      { playerIndex: 4, answer: '4', shouldBeCorrect: true },
      
      // Question 4: Final eliminations
      { playerIndex: 0, answer: 'Da Vinci', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Da Vinci', shouldBeCorrect: true },
      { playerIndex: 2, answer: 'Van Gogh', shouldBeCorrect: false },
      { playerIndex: 3, answer: 'Da Vinci', shouldBeCorrect: true },
      { playerIndex: 4, answer: 'Da Vinci', shouldBeCorrect: true },
      
      // Question 5: Final question
      { playerIndex: 0, answer: 'Pacific', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'Pacific', shouldBeCorrect: true },
      { playerIndex: 2, answer: 'Pacific', shouldBeCorrect: true },
      { playerIndex: 3, answer: 'Pacific', shouldBeCorrect: true },
      { playerIndex: 4, answer: 'Atlantic', shouldBeCorrect: false }
    ];

    for (let questionNum = 0; questionNum < 5; questionNum++) {
      console.log(`\n🎯 Question ${questionNum + 1}:`);
      
      // Get answers for this question
      const questionAnswers = answerScenarios.slice(questionNum * 5, (questionNum + 1) * 5);
      
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

        await this.sleep(2000); // Wait 2 seconds between answers
      }

      // Wait for question to complete
      await this.sleep(5000);
      
      console.log(`📊 After Question ${questionNum + 1}:`);
      console.log(`   Alive: ${gameState.players.filter(p => p.status === 'alive').length}`);
      console.log(`   Eliminated: ${gameState.players.filter(p => p.status === 'eliminated').length}`);
    }

    console.log('\n✅ Question flow simulation complete!\n');
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
        
        // Send winner notifications
        await notificationService.sendWinnerNotifications(
          this.testGame.id,
          winners.map(w => w.user),
          this.testGame.prize_pool,
          this.testGame.prize_pool / winners.length
        );
        console.log('✅ Winner notifications sent!');
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

  async runMultiUserTest() {
    console.log('🎮 Starting Multi-User Game Simulation\n');
    console.log('=' .repeat(60));

    try {
      await this.setupTestUsers();
      await this.createTestGame();
      await this.simulateUserRegistration();
      await this.simulateGameStart();
      await this.simulateQuestionFlow();
      await this.checkGameResults();

      console.log('=' .repeat(60));
      console.log('🎉 Multi-User Game Simulation Completed Successfully!\n');

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
  const simulator = new MultiUserSimulator();
  await simulator.runMultiUserTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MultiUserSimulator;
