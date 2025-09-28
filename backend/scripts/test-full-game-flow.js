#!/usr/bin/env node

require('dotenv').config();
const { Game, User, Question, GamePlayer } = require('../models');
const gameService = require('../services/gameService');
const queueService = require('../services/queueService');
const rewardService = require('../services/rewardService');

class FullGameTester {
  constructor() {
    this.testUsers = [];
    this.testGame = null;
    this.testQuestions = [];
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...\n');

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
      console.log(`👤 ${created ? 'Created' : 'Found'} user: ${user.nickname}`);
    }

    console.log('\n✅ Test data setup complete!\n');
  }

  async createTestGame() {
    console.log('🎮 Creating test game...\n');

    // Create a game starting in 1 minute
    const startTime = new Date(Date.now() + 60000); // 1 minute from now

    this.testGame = await Game.create({
      status: 'scheduled',
      prize_pool: 50.00,
      start_time: startTime,
      total_questions: 3,
      game_config: {
        questionTimer: 10,
        maxPlayers: 100,
        eliminationMode: 'sudden_death'
      }
    });

    // Create test questions with game_id
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
    const notificationService = require('../services/notificationService');
    await notificationService.scheduleGameReminders(this.testGame.id);

    console.log(`✅ Created game: ${this.testGame.id}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}`);
    console.log(`⏰ Start time: ${this.testGame.start_time}`);
    console.log(`❓ Questions: ${this.testQuestions.length}`);
    console.log(`🔔 Reminders scheduled for 30min and 5min before start\n`);

    return this.testGame;
  }

  async addPlayersToGame() {
    console.log('👥 Adding players to game...\n');

    for (const user of this.testUsers) {
      const gamePlayer = await GamePlayer.create({
        game_id: this.testGame.id,
        user_id: user.id,
        status: 'alive'
      });
      console.log(`✅ Added ${user.nickname} to game`);
    }

    // Update game player count
    await this.testGame.updatePlayerCount(this.testUsers.length);
    console.log(`\n✅ Added ${this.testUsers.length} players to game\n`);
  }

  async testGameStart() {
    console.log('🚀 Testing game start...\n');

    try {
      const gameState = await gameService.startGame(this.testGame.id);
      console.log('✅ Game started successfully!');
      console.log(`📊 Game state:`, {
        gameId: gameState.gameId,
        currentQuestion: gameState.currentQuestion,
        playersCount: gameState.players.length,
        questionsCount: gameState.questions.length
      });

      // Wait a bit for game start messages to be sent
      await this.sleep(2000);
      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  async testPlayerAnswers() {
    console.log('🎯 Testing player answers...\n');

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      throw new Error('Game state not found');
    }

    // Simulate different answer scenarios
    const answerScenarios = [
      { playerIndex: 0, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 1, answer: 'London', shouldBeCorrect: false },
      { playerIndex: 2, answer: 'Paris', shouldBeCorrect: true },
      { playerIndex: 3, answer: null, shouldBeCorrect: false } // No answer (timeout)
    ];

    for (const scenario of answerScenarios) {
      const player = gameState.players[scenario.playerIndex];
      if (!player) continue;

      console.log(`👤 Testing ${player.user.nickname}:`);
      console.log(`   Answer: ${scenario.answer || 'No answer (timeout)'}`);
      console.log(`   Expected: ${scenario.shouldBeCorrect ? 'Correct' : 'Incorrect/Eliminated'}`);

      if (scenario.answer) {
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
      } else {
        console.log(`   ⏰ Simulating timeout (no answer)`);
      }

      await this.sleep(1000); // Wait between answers
    }

    console.log('\n✅ Player answer testing complete!\n');
  }

  async testQuestionFlow() {
    console.log('❓ Testing question flow...\n');

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

    // Test timer updates
    console.log('\n⏰ Testing timer updates...');
    await this.sleep(5000); // Wait for timer updates

    console.log('\n✅ Question flow testing complete!\n');
  }

  async testEliminationLogic() {
    console.log('💀 Testing elimination logic...\n');

    const gameState = gameService.activeGames.get(this.testGame.id);
    if (!gameState) {
      console.log('❌ Game state not found - game may have ended');
      return;
    }

    const alivePlayers = gameState.players.filter(p => p.status === 'alive');
    const eliminatedPlayers = gameState.players.filter(p => p.status === 'eliminated');

    console.log(`📊 Elimination status:`);
    console.log(`   Alive players: ${alivePlayers.length}`);
    console.log(`   Eliminated players: ${eliminatedPlayers.length}`);

    for (const player of gameState.players) {
      console.log(`   ${player.user.nickname}: ${player.status} ${player.eliminatedAt ? `(eliminated on Q${player.eliminatedOnQuestion})` : ''}`);
    }

    console.log('\n✅ Elimination logic testing complete!\n');
  }

  async testPrizeSplitting() {
    console.log('💰 Testing prize splitting...\n');

    try {
      // Simulate game end with multiple winners
      const gameResults = await rewardService.processGameRewards(this.testGame.id);
      
      console.log('🏆 Game results:');
      console.log(`   Winner count: ${gameResults.winnerCount}`);
      console.log(`   Prize pool: $${gameResults.prizePool}`);
      console.log(`   Individual prize: $${gameResults.individualPrize}`);
      console.log(`   Game status: ${gameResults.gameStatus}`);

      if (gameResults.prizeDistribution) {
        console.log('\n💰 Prize distribution:');
        for (const [userId, amount] of Object.entries(gameResults.prizeDistribution)) {
          const user = this.testUsers.find(u => u.id === userId);
          console.log(`   ${user ? user.nickname : userId}: $${amount}`);
        }
      }

      console.log('\n✅ Prize splitting testing complete!\n');

    } catch (error) {
      console.error('❌ Error testing prize splitting:', error);
    }
  }

  async testReminders() {
    console.log('🔔 Testing reminders...\n');

    try {
      // Test sending game reminders
      for (const user of this.testUsers) {
        await queueService.addMessage('send_message', {
          to: user.whatsapp_number,
          message: `🔔 Test reminder: Next QRush Trivia game starts soon!\n\n💰 Prize pool: $${this.testGame.prize_pool}\n⏰ Start time: ${this.testGame.start_time}\n\nReply "PLAY" to join!`
        });
        console.log(`✅ Sent reminder to ${user.nickname}`);
      }

      console.log('\n✅ Reminder testing complete!\n');

    } catch (error) {
      console.error('❌ Error testing reminders:', error);
    }
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

  async runFullTest() {
    console.log('🎮 Starting Full Game Flow Test\n');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.setupTestData();
      await this.createTestGame();
      await this.addPlayersToGame();

      // Test game flow
      await this.testGameStart();
      await this.testPlayerAnswers();
      await this.testQuestionFlow();
      await this.testEliminationLogic();
      await this.testPrizeSplitting();
      await this.testReminders();

      console.log('=' .repeat(50));
      console.log('🎉 Full Game Flow Test Completed Successfully!\n');

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
  const tester = new FullGameTester();
  await tester.runFullTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FullGameTester;
