const User = require('./User');
const Game = require('./Game');
const Question = require('./Question');
const GamePlayer = require('./GamePlayer');
const PlayerAnswer = require('./PlayerAnswer');

// Define associations
Game.hasMany(Question, { foreignKey: 'game_id', as: 'questions' });
Question.belongsTo(Game, { foreignKey: 'game_id', as: 'game' });

Game.hasMany(GamePlayer, { foreignKey: 'game_id', as: 'players' });
GamePlayer.belongsTo(Game, { foreignKey: 'game_id', as: 'game' });

User.hasMany(GamePlayer, { foreignKey: 'user_id', as: 'gameParticipations' });
GamePlayer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Game.hasMany(PlayerAnswer, { foreignKey: 'game_id', as: 'answers' });
PlayerAnswer.belongsTo(Game, { foreignKey: 'game_id', as: 'game' });

User.hasMany(PlayerAnswer, { foreignKey: 'user_id', as: 'answers' });
PlayerAnswer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Question.hasMany(PlayerAnswer, { foreignKey: 'question_id', as: 'playerAnswers' });
PlayerAnswer.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

module.exports = {
  User,
  Game,
  Question,
  GamePlayer,
  PlayerAnswer
};
