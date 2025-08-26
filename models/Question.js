const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
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
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  correct_answer: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  option_a: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  option_b: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  option_c: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  option_d: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  question_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium'
  },
  time_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 5,
      max: 60
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'questions',
  timestamps: true,
  indexes: [
    {
      fields: ['game_id']
    },
    {
      fields: ['question_order']
    },
    {
      fields: ['category']
    },
    {
      fields: ['difficulty']
    }
  ]
});

// Instance methods
Question.prototype.getRandomizedOptions = function() {
  const options = [this.option_a, this.option_b, this.option_c, this.option_d];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
};

Question.prototype.isCorrectAnswer = function(answer) {
  return answer === this.correct_answer;
};

// Class methods
Question.getByGameAndOrder = function(gameId, order) {
  return this.findOne({
    where: {
      game_id: gameId,
      question_order: order,
      is_active: true
    }
  });
};

Question.getGameQuestions = function(gameId) {
  return this.findAll({
    where: {
      game_id: gameId,
      is_active: true
    },
    order: [['question_order', 'ASC']]
  });
};

Question.createFromTemplate = function(template, gameId, order) {
  return this.create({
    game_id: gameId,
    question_text: template.question,
    correct_answer: template.correct_answer,
    option_a: template.option_a,
    option_b: template.option_b,
    option_c: template.option_c,
    option_d: template.option_d,
    question_order: order,
    category: template.category || 'general',
    difficulty: template.difficulty || 'medium',
    time_limit: template.time_limit || 10
  });
};

module.exports = Question;
