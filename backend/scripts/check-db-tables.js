#!/usr/bin/env node

const { sequelize } = require('../config/database');
const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');

console.log('🔍 Checking Database Tables');
console.log('===========================');

async function checkTables() {
  try {
    console.log('🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    console.log('\n🔄 Checking if tables exist...');
    
    // Check each table
    const tables = [
      { name: 'users', model: User },
      { name: 'games', model: Game },
      { name: 'questions', model: Question },
      { name: 'game_players', model: GamePlayer },
      { name: 'player_answers', model: PlayerAnswer }
    ];

    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`✅ Table '${table.name}' exists (${count} records)`);
      } catch (error) {
        console.log(`❌ Table '${table.name}' does not exist: ${error.message}`);
      }
    }

    console.log('\n🔄 Attempting to sync tables...');
    await sequelize.sync({ force: false });
    console.log('✅ Database sync completed');

    console.log('\n🔄 Re-checking tables after sync...');
    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`✅ Table '${table.name}' exists (${count} records)`);
      } catch (error) {
        console.log(`❌ Table '${table.name}' still missing: ${error.message}`);
      }
    }

    console.log('\n✅ Database table check completed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database table check failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

checkTables();
