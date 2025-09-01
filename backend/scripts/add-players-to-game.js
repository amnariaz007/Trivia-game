const { User, Game, GamePlayer } = require('../models');

async function addPlayersToGame(gameId) {
  try {
    console.log(`🔄 Adding test players to game: ${gameId}`);

    // Get the game
    const game = await Game.findByPk(gameId);
    if (!game) {
      console.error('❌ Game not found');
      return;
    }

    console.log(`📊 Game: ${game.id} (${game.status})`);

    // Get all active users
    const users = await User.findAll({ where: { is_active: true } });
    console.log(`👥 Found ${users.length} active users`);

    // Add each user to the game
    for (const user of users) {
      // Check if user is already in the game
      const existingPlayer = await GamePlayer.findOne({
        where: {
          game_id: gameId,
          user_id: user.id
        }
      });

      if (!existingPlayer) {
        await GamePlayer.create({
          game_id: gameId,
          user_id: user.id,
          status: 'registered'
        });
        console.log(`✅ Added ${user.nickname} to game`);
      } else {
        console.log(`⏭️  ${user.nickname} already in game`);
      }
    }

    // Show game players count
    const playerCount = await GamePlayer.count({ where: { game_id: gameId } });
    console.log(`📊 Total players in game: ${playerCount}`);

    console.log('✅ Players added successfully!');

  } catch (error) {
    console.error('❌ Error adding players to game:', error);
  } finally {
    process.exit(0);
  }
}

// Get game ID from command line argument
const gameId = process.argv[2];

if (!gameId) {
  console.error('❌ Please provide a game ID');
  console.log('Usage: node scripts/add-players-to-game.js <game-id>');
  process.exit(1);
}

addPlayersToGame(gameId);
