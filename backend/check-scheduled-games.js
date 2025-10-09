/**
 * Check Scheduled Games Script
 * Shows all scheduled games and their details
 */

const axios = require('axios');

async function checkScheduledGames() {
  try {
    console.log('🔍 Checking scheduled games...');
    
    const response = await axios.get('https://ingenious-abundance-production.up.railway.app/admin/games', {
      headers: {
        'username': 'admin',
        'password': 'admin123'
      }
    });
    
    const games = response.data;
    const now = new Date();
    
    console.log(`📊 Found ${games.length} total games`);
    console.log('='.repeat(60));
    
    games.forEach((game, index) => {
      const startTime = new Date(game.start_time);
      const timeUntilStart = startTime.getTime() - now.getTime();
      const minutesUntilStart = Math.round(timeUntilStart / (1000 * 60));
      
      console.log(`\n🎮 Game ${index + 1}:`);
      console.log(`   ID: ${game.id}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Start Time: ${startTime.toLocaleString()}`);
      console.log(`   Prize Pool: $${game.prize_pool}`);
      console.log(`   Total Questions: ${game.total_questions}`);
      console.log(`   Players: ${game.total_players}`);
      
      if (game.status === 'scheduled') {
        if (minutesUntilStart > 0) {
          console.log(`   ⏰ Starts in: ${minutesUntilStart} minutes`);
        } else {
          console.log(`   🚀 Should start now! (${Math.abs(minutesUntilStart)} minutes late)`);
        }
      } else if (game.status === 'pre_game') {
        console.log(`   🎯 Game is in pre-game phase`);
      } else if (game.status === 'in_progress') {
        console.log(`   🔥 Game is currently running!`);
      } else if (game.status === 'finished') {
        console.log(`   ✅ Game completed`);
      }
    });
    
    // Check for games starting soon
    const upcomingGames = games.filter(game => {
      const startTime = new Date(game.start_time);
      const timeUntilStart = startTime.getTime() - now.getTime();
      return game.status === 'scheduled' && timeUntilStart > 0 && timeUntilStart <= 60 * 60 * 1000; // Next hour
    });
    
    if (upcomingGames.length > 0) {
      console.log('\n🚨 UPCOMING GAMES:');
      console.log('='.repeat(60));
      upcomingGames.forEach(game => {
        const startTime = new Date(game.start_time);
        const timeUntilStart = startTime.getTime() - now.getTime();
        const minutesUntilStart = Math.round(timeUntilStart / (1000 * 60));
        
        console.log(`🎮 Game ${game.id.slice(0, 8)}... starts in ${minutesUntilStart} minutes`);
        console.log(`   Time: ${startTime.toLocaleString()}`);
        console.log(`   Prize: $${game.prize_pool}`);
      });
    }
    
    return games;
    
  } catch (error) {
    console.error('❌ Error checking scheduled games:', error.message);
    return [];
  }
}

// Run the check
if (require.main === module) {
  checkScheduledGames()
    .then(games => {
      console.log('\n✅ Game check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { checkScheduledGames };
