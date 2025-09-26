#!/usr/bin/env node

require('dotenv').config();
const { Game, User, GamePlayer } = require('../models');
const notificationService = require('../services/notificationService');

async function testReminders() {
  console.log('🔔 Testing Reminder System\n');

  try {
    // Create a test game starting in 2 minutes (for quick testing)
    const startTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    
    console.log('🎮 Creating test game...');
    const game = await Game.create({
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

    console.log(`✅ Game created: ${game.id}`);
    console.log(`⏰ Start time: ${startTime.toLocaleString()}`);

    // Add a test player
    const [user, created] = await User.findOrCreate({
      where: { whatsapp_number: '923196612416' },
      defaults: { 
        nickname: 'TestPlayer', 
        whatsapp_number: '923196612416' 
      }
    });

    await GamePlayer.create({
      game_id: game.id,
      user_id: user.id,
      status: 'alive'
    });

    console.log(`👤 Added player: ${user.nickname}`);

    // Schedule reminders
    console.log('\n🔔 Scheduling reminders...');
    await notificationService.scheduleGameReminders(game.id);
    
    console.log('✅ Reminders scheduled!');
    console.log('\n📱 You should receive:');
    console.log('   - 30-minute reminder (if game starts in >30min)');
    console.log('   - 5-minute reminder (if game starts in >5min)');
    console.log('   - Game start notification when game begins');
    
    console.log('\n⏳ Waiting for reminders...');
    console.log('   (This test will run for 3 minutes to catch reminders)');
    
    // Wait 3 minutes to see reminders
    await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));
    
    console.log('\n🧹 Cleaning up...');
    await GamePlayer.destroy({ where: { game_id: game.id } });
    await game.destroy();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testReminders().catch(console.error);



