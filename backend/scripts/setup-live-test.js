#!/usr/bin/env node

require('dotenv').config();
const { Game, User, Question } = require('../models');
const notificationService = require('../services/notificationService');

class LiveTestSetup {
  constructor() {
    this.testGame = null;
    this.testQuestions = [];
  }

  async createLiveTestGame() {
    console.log('🎮 Setting up LIVE test game for real users...\n');

    // Create a game starting in 5 minutes to give users time to join
    const startTime = new Date(Date.now() + 5 * 60 * 1000);

    this.testGame = await Game.create({
      status: 'scheduled',
      prize_pool: 100.00,
      start_time: startTime,
      total_questions: 5,
      game_config: {
        questionTimer: 20,
        maxPlayers: 50,
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

    console.log(`\n✅ LIVE TEST GAME CREATED!`);
    console.log(`🎮 Game ID: ${this.testGame.id}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}`);
    console.log(`⏰ Start time: ${this.testGame.start_time.toLocaleString()}`);
    console.log(`❓ Questions: ${this.testQuestions.length}`);
    console.log(`👥 Max players: ${this.testGame.game_config.maxPlayers}`);
    console.log(`⏱️ Question timer: ${this.testGame.game_config.questionTimer} seconds\n`);

    return this.testGame;
  }

  async sendGameAnnouncement() {
    console.log('📢 Sending game announcement to all users...\n');

    try {
      await notificationService.sendGameAnnouncement(this.testGame.id);
      console.log('✅ Game announcement sent to all users!\n');
    } catch (error) {
      console.error('❌ Error sending announcement:', error);
    }
  }

  async showInstructions() {
    console.log('📋 LIVE TEST INSTRUCTIONS:');
    console.log('=' .repeat(50));
    console.log('1. Share your WhatsApp number with test users');
    console.log('2. Tell them to text "JOIN" to register');
    console.log('3. Game starts in 5 minutes');
    console.log('4. Watch the logs for real-time activity');
    console.log('5. Users will get reminders at 30min and 5min');
    console.log('6. Game will start automatically');
    console.log('7. Monitor the webhook logs for user interactions');
    console.log('=' .repeat(50));
    console.log(`\n🎯 Your WhatsApp number: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`⏰ Game starts: ${this.testGame.start_time.toLocaleString()}`);
    console.log(`💰 Prize pool: $${this.testGame.prize_pool}\n`);
  }

  async runLiveTestSetup() {
    console.log('🎮 Setting up LIVE Multi-User Test\n');
    console.log('=' .repeat(60));

    try {
      await this.createLiveTestGame();
      await this.sendGameAnnouncement();
      await this.showInstructions();

      console.log('=' .repeat(60));
      console.log('🎉 LIVE TEST SETUP COMPLETE!\n');
      console.log('👥 Ready for real users to join!');
      console.log('📱 Monitor your webhook logs for user activity\n');

    } catch (error) {
      console.error('❌ Setup failed:', error);
    }
  }
}

// Run the setup
async function main() {
  const setup = new LiveTestSetup();
  await setup.runLiveTestSetup();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LiveTestSetup;



