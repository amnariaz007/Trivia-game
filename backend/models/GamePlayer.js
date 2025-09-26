const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GamePlayer = sequelize.define('GamePlayer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  game_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'games',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('registered', 'alive', 'eliminated', 'winner'),
    defaultValue: 'registered',
    allowNull: false
  },
  eliminated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  eliminated_by_question: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  correct_answers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_answers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'game_players',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['eliminated_at']
    }
  ]
});

// Instance methods
GamePlayer.prototype.eliminate = function(questionNumber) {
  this.status = 'eliminated';
  this.eliminated_at = new Date();
  this.eliminated_by_question = questionNumber;
  return this.save();
};

GamePlayer.prototype.markAsWinner = function() {
  this.status = 'winner';
  return this.save();
};

GamePlayer.prototype.updateActivity = function() {
  this.last_activity = new Date();
  return this.save();
};

GamePlayer.prototype.incrementCorrectAnswers = function() {
  this.correct_answers += 1;
  this.total_answers += 1;
  return this.save();
};

GamePlayer.prototype.incrementTotalAnswers = function() {
  this.total_answers += 1;
  return this.save();
};

// Class methods
GamePlayer.getAlivePlayers = function(gameId) {
  return this.findAll({
    where: {
      game_id: gameId,
      status: 'alive'
    },
    include: [{
      model: sequelize.models.User,
      attributes: ['nickname', 'whatsapp_number']
    }]
  });
};

GamePlayer.getWinners = function(gameId) {
  return this.findAll({
    where: {
      game_id: gameId,
      status: 'winner'
    },
    include: [{
      model: sequelize.models.User,
      attributes: ['nickname', 'whatsapp_number']
    }]
  });
};

GamePlayer.getPlayerByGameAndUser = function(gameId, userId) {
  return this.findOne({
    where: {
      game_id: gameId,
      user_id: userId
    }
  });
};

GamePlayer.getGameStats = function(gameId) {
  return this.findAll({
    where: { game_id: gameId },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });
};

module.exports = GamePlayer;
