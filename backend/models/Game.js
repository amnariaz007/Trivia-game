const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'pre_game', 'in_progress', 'finished', 'cancelled', 'expired'),
    defaultValue: 'scheduled',
    allowNull: false
  },
  prize_pool: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 100.00
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  winner_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_players: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  current_question: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_questions: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  game_config: {
    type: DataTypes.JSONB,
    defaultValue: {
      questionTimer: 10,
      maxPlayers: 100,
      eliminationMode: 'sudden_death'
    }
  }
}, {
  tableName: 'games',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['start_time']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Instance methods
Game.prototype.startGame = function() {
  this.status = 'in_progress';
  this.start_time = new Date();
  return this.save();
};

Game.prototype.finishGame = function() {
  this.status = 'finished';
  this.end_time = new Date();
  return this.save();
};

Game.prototype.updateQuestion = function(questionNumber) {
  this.current_question = questionNumber;
  return this.save();
};

Game.prototype.updatePlayerCount = function(count) {
  this.total_players = count;
  return this.save();
};

// Class methods
Game.getActiveGame = async function() {
  const now = new Date();
  
  // First, automatically expire any games that should have started but haven't
  await this.update(
    { status: 'expired' },
    {
      where: {
        status: ['scheduled', 'pre_game'],
        start_time: {
          [Op.lt]: now
        }
      }
    }
  );
  
  // Then find the current active game
  return this.findOne({
    where: {
      status: ['scheduled', 'pre_game', 'in_progress']
    },
    order: [['createdAt', 'DESC']]
  });
};

Game.getScheduledGames = function() {
  return this.findAll({
    where: {
      status: 'scheduled',
      start_time: {
        [Op.gt]: new Date()
      }
    },
    order: [['start_time', 'ASC']]
  });
};

Game.getExpiredGames = function() {
  return this.findAll({
    where: {
      status: 'expired'
    },
    order: [['start_time', 'DESC']]
  });
};

Game.getRecentGames = function(limit = 10) {
  return this.findAll({
    where: {
      status: 'finished'
    },
    order: [['end_time', 'DESC']],
    limit
  });
};

module.exports = Game;
