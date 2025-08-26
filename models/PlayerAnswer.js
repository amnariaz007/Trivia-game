const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlayerAnswer = sequelize.define('PlayerAnswer', {
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
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'questions',
      key: 'id'
    }
  },
  selected_answer: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  answered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to answer in milliseconds'
  },
  question_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Question number in the game sequence'
  }
}, {
  tableName: 'player_answers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'user_id', 'question_id']
    },
    {
      fields: ['is_correct']
    },
    {
      fields: ['answered_at']
    },
    {
      fields: ['question_number']
    }
  ]
});

// Instance methods
PlayerAnswer.prototype.calculateResponseTime = function(questionStartTime) {
  if (questionStartTime) {
    this.response_time_ms = Date.now() - questionStartTime.getTime();
  }
  return this.save();
};

// Class methods
PlayerAnswer.getPlayerAnswersForGame = function(gameId, userId) {
  return this.findAll({
    where: {
      game_id: gameId,
      user_id: userId
    },
    include: [{
      model: sequelize.models.Question,
      attributes: ['question_text', 'correct_answer', 'question_order']
    }],
    order: [['question_number', 'ASC']]
  });
};

PlayerAnswer.getQuestionStats = function(gameId, questionId) {
  return this.findAll({
    where: {
      game_id: gameId,
      question_id: questionId
    },
    attributes: [
      'is_correct',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['is_correct']
  });
};

PlayerAnswer.getCorrectAnswersForQuestion = function(gameId, questionId) {
  return this.findAll({
    where: {
      game_id: gameId,
      question_id: questionId,
      is_correct: true
    },
    include: [{
      model: sequelize.models.User,
      attributes: ['nickname']
    }]
  });
};

PlayerAnswer.getPlayerAnswerForQuestion = function(gameId, userId, questionId) {
  return this.findOne({
    where: {
      game_id: gameId,
      user_id: userId,
      question_id: questionId
    }
  });
};

PlayerAnswer.getGameSummary = function(gameId) {
  return this.findAll({
    where: { game_id: gameId },
    attributes: [
      'user_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_answers'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_correct THEN 1 ELSE 0 END')), 'correct_answers'],
      [sequelize.fn('AVG', sequelize.col('response_time_ms')), 'avg_response_time']
    ],
    group: ['user_id'],
    include: [{
      model: sequelize.models.User,
      attributes: ['nickname']
    }]
  });
};

module.exports = PlayerAnswer;
