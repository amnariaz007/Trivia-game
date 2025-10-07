const { Game, GamePlayer, User } = require('../models');
const queueService = require('./queueService');

class RewardService {
  constructor() {
    this.minimumPrize = 0.01; // Minimum prize per winner
  }

  /**
   * Calculate prize distribution for winners
   * @param {number} prizePool - Total prize pool amount
   * @param {number} winnerCount - Number of surviving players
   * @returns {Object} Prize distribution details
   */
  calculatePrizeDistribution(prizePool, winnerCount) {
    if (winnerCount === 0) {
      return {
        totalPrize: prizePool,
        winnerCount: 0,
        prizePerWinner: 0,
        remainder: prizePool,
        distribution: []
      };
    }

    if (winnerCount === 1) {
      return {
        totalPrize: prizePool,
        winnerCount: 1,
        prizePerWinner: prizePool,
        remainder: 0,
        distribution: [{
          winnerNumber: 1,
          amount: prizePool,
          isRemainder: false
        }]
      };
    }

    // Multiple winners - split evenly
    const basePrize = prizePool / winnerCount;
    const roundedPrize = Math.floor(basePrize * 100) / 100; // Round down to 2 decimals
    
    let totalDistributed = roundedPrize * winnerCount;
    let remainder = prizePool - totalDistributed;
    
    // Distribute remainder cents fairly
    const distribution = [];
    let remainingCents = Math.round(remainder * 100);
    
    for (let i = 0; i < winnerCount; i++) {
      let winnerPrize = roundedPrize;
      
      // Add 1 cent to first few winners if there's remainder
      if (remainingCents > 0) {
        winnerPrize += 0.01;
        remainingCents--;
      }
      
      distribution.push({
        winnerNumber: i + 1,
        amount: winnerPrize,
        isRemainder: winnerPrize > roundedPrize
      });
    }

    return {
      totalPrize: prizePool,
      winnerCount: winnerCount,
      prizePerWinner: roundedPrize,
      remainder: remainder,
      distribution: distribution
    };
  }

  /**
   * Process end-of-game rewards
   * @param {string} gameId - Game ID
   * @returns {Object} Game results and reward details
   */
  async processGameRewards(gameId) {
    try {
      console.log(`🏆 Processing rewards for game: ${gameId}`);
      
      // Get game details
      const game = await Game.findByPk(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Get all surviving players (with detailed logging)
      const survivors = await GamePlayer.findAll({
        where: {
          game_id: gameId,
          status: 'alive'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'whatsapp_number']
        }]
      });

      const winnerCount = survivors.length;
      console.log(`🎯 Found ${winnerCount} survivors in game ${gameId}`);
      console.log(`🎯 Survivors:`, survivors.map(s => `${s.user.nickname} (${s.user.whatsapp_number})`));

      // Calculate prize distribution
      const prizeDistribution = this.calculatePrizeDistribution(
        parseFloat(game.prize_pool),
        winnerCount
      );

      // Update game with winner count
      await game.update({
        winner_count: winnerCount,
        status: 'finished',
        end_time: new Date()
      });

      // Update player statuses to 'winner' BEFORE sending notifications
      const updateResult = await GamePlayer.update(
        { status: 'winner' },
        { where: { game_id: gameId, status: 'alive' } }
      );
      console.log(`✅ Updated ${updateResult[0]} players to winner status`);

      // Verify survivors are still valid after status update
      if (survivors.length === 0) {
        console.log(`⚠️ No survivors found - skipping winner notifications`);
      } else {
        // Send winner notifications
        console.log(`📱 Sending winner notifications to ${survivors.length} players...`);
        await this.notifyWinners(game, survivors, prizeDistribution);
      }

      // Send game end announcement
      await this.announceGameEnd(game, prizeDistribution);

      return {
        gameId,
        gameStatus: 'finished',
        winnerCount,
        prizeDistribution,
        survivors: survivors.map(s => ({
          id: s.user.id,
          nickname: s.user.nickname,
          whatsapp_number: s.user.whatsapp_number
        }))
      };

    } catch (error) {
      console.error('❌ Error processing game rewards:', error);
      throw error;
    }
  }

  /**
   * Notify individual winners
   * @param {Game} game - Game instance
   * @param {Array} survivors - Array of surviving players
   * @param {Object} prizeDistribution - Prize distribution details
   */
  async notifyWinners(game, survivors, prizeDistribution) {
    try {
      console.log(`📱 Notifying ${survivors.length} winners...`);

      if (survivors.length === 0) {
        console.log(`⚠️ No survivors to notify`);
        return;
      }

      let notificationsSent = 0;
      let notificationsFailed = 0;

      for (let i = 0; i < survivors.length; i++) {
        const survivor = survivors[i];
        const distribution = prizeDistribution.distribution[i];
        
        if (!survivor.user || !survivor.user.whatsapp_number) {
          console.log(`❌ Invalid survivor data for index ${i}:`, survivor);
          notificationsFailed++;
          continue;
        }
        
        let message = '';
        
        if (prizeDistribution.winnerCount === 1) {
          message = `🏆 CONGRATULATIONS! You're the WINNER of QRush Trivia!

💰 Prize: $${distribution.amount.toFixed(2)}
🎮 Game: ${game.id.slice(0, 8)}...
⏰ Completed: ${new Date().toLocaleString()}

You'll receive your payout within 24 hours. Thanks for playing!`;
        } else {
          message = `🏆 CONGRATULATIONS! You're one of ${prizeDistribution.winnerCount} WINNERS!

💰 Your Prize: $${distribution.amount.toFixed(2)}
🎮 Game: ${game.id.slice(0, 8)}...
⏰ Completed: ${new Date().toLocaleString()}

You'll receive your payout within 24 hours. Thanks for playing!`;
        }

        try {
          // Send winner notification
          await queueService.addMessage('send_message', {
            to: survivor.user.whatsapp_number,
            message: message,
            gameId: game.id,
            messageType: 'winner_notification'
          });

          console.log(`✅ Winner notification sent to ${survivor.user.nickname} (${survivor.user.whatsapp_number})`);
          notificationsSent++;
        } catch (notificationError) {
          console.error(`❌ Failed to send winner notification to ${survivor.user.nickname}:`, notificationError);
          notificationsFailed++;
        }
      }

      console.log(`📊 Winner notification summary: ${notificationsSent} sent, ${notificationsFailed} failed`);

    } catch (error) {
      console.error('❌ Error notifying winners:', error);
    }
  }

  /**
   * Announce game end to all players
   * @param {Game} game - Game instance
   * @param {Object} prizeDistribution - Prize distribution details
   */
  async announceGameEnd(game, prizeDistribution) {
    try {
      console.log('📢 Announcing game end...');

      // Get all players in the game
      const allPlayers = await GamePlayer.findAll({
        where: { game_id: game.id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['whatsapp_number']
        }]
      });

      let announcementMessage = '';

      if (prizeDistribution.winnerCount === 0) {
        announcementMessage = `🎮 Game Over - No Winners!

❌ All players were eliminated before the final question.

💰 Prize pool: $${prizeDistribution.totalPrize.toFixed(2)}
🎮 Game: ${game.id.slice(0, 8)}...

Better luck next time! Reply "PLAY" for the next game.`;
      } else if (prizeDistribution.winnerCount === 1) {
        announcementMessage = `🎮 Game Over - We Have a Winner!

🏆 Single Winner: ${prizeDistribution.winnerCount} player survived!
💰 Prize: $${prizeDistribution.totalPrize.toFixed(2)}
🎮 Game: ${game.id.slice(0, 8)}...

Winner has been contacted directly for payout.
Reply "PLAY" for the next game!`;
      } else {
        announcementMessage = `🎮 Game Over - Multiple Winners!

🏆 Winners: ${prizeDistribution.winnerCount} players survived!
💰 Prize Pool: $${prizeDistribution.totalPrize.toFixed(2)}
💰 Each Winner: $${prizeDistribution.prizePerWinner.toFixed(2)}
🎮 Game: ${game.id.slice(0, 8)}...

All winners have been contacted directly for payout.
Reply "PLAY" for the next game!`;
      }

      // Send announcement to all players with deduplication and delay
      setTimeout(async () => {
        for (const player of allPlayers) {
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: announcementMessage,
            gameId: game.id,
            messageType: 'game_end'
          });
        }
      }, 2000); // 2 second delay to separate from elimination messages

      console.log('✅ Game end announcement sent to all players');

    } catch (error) {
      console.error('❌ Error announcing game end:', error);
    }
  }

  /**
   * Get game statistics for admin
   * @param {string} gameId - Game ID
   * @returns {Object} Game statistics
   */
  async getGameStats(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [{
          model: GamePlayer,
          as: 'players',
          include: [{
            model: User,
            as: 'user',
            attributes: ['nickname', 'whatsapp_number']
          }]
        }]
      });

      if (!game) {
        throw new Error('Game not found');
      }

      const winners = game.players.filter(p => p.status === 'winner');
      const eliminated = game.players.filter(p => p.status === 'eliminated');
      const spectators = game.players.filter(p => p.status === 'spectator');

      return {
        gameId: game.id,
        status: game.status,
        prizePool: parseFloat(game.prize_pool),
        winnerCount: winners.length,
        eliminatedCount: eliminated.length,
        spectatorCount: spectators.length,
        totalPlayers: game.total_players,
        startTime: game.start_time,
        endTime: game.end_time,
        winners: winners.map(w => ({
          nickname: w.user.nickname,
          whatsapp_number: w.user.whatsapp_number
        })),
        duration: game.end_time ? 
          Math.round((game.end_time - game.start_time) / 1000) : null
      };

    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      throw error;
    }
  }

  /**
   * Validate prize pool amount
   * @param {number} amount - Prize pool amount
   * @returns {boolean} Is valid
   */
  validatePrizePool(amount) {
    return amount >= 0 && amount <= 10000; // Allow $0 prize pool, max $10,000 prize pool
  }
}

module.exports = new RewardService();
