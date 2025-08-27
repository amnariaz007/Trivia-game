const express = require('express');
const router = express.Router();
const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');

// Basic authentication middleware (will be enhanced in Week 3)
const authenticateAdmin = (req, res, next) => {
  const { username, password } = req.headers;
  
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Apply authentication to all admin routes
router.use(authenticateAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userCount = await User.count();
    const activeGame = await Game.getActiveGame();
    const recentGames = await Game.getRecentGames(5);
    
    res.json({
      users: userCount,
      activeGame: activeGame ? {
        id: activeGame.id,
        status: activeGame.status,
        startTime: activeGame.start_time,
        prizePool: activeGame.prize_pool
      } : null,
      recentGames: recentGames.map(game => ({
        id: game.id,
        status: game.status,
        startTime: game.start_time,
        endTime: game.end_time,
        winnerCount: game.winner_count,
        totalPlayers: game.total_players
      }))
    });
  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nickname', 'whatsapp_number', 'is_active', 'created_at', 'last_activity'],
      order: [['created_at', 'DESC']]
    });
    
    res.json(users);
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all games
router.get('/games', async (req, res) => {
  try {
    const games = await Game.findAll({
      include: [{
        model: GamePlayer,
        as: 'players',
        attributes: ['status'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['nickname']
        }]
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json(games);
  } catch (error) {
    console.error('❌ Error getting games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new game
router.post('/games', async (req, res) => {
  try {
    const { startTime, prizePool, totalQuestions } = req.body;
    
    if (!startTime || !prizePool) {
      return res.status(400).json({ error: 'Start time and prize pool are required' });
    }
    
    const game = await Game.create({
      start_time: new Date(startTime),
      prize_pool: prizePool,
      total_questions: totalQuestions || 10,
      status: 'scheduled'
    });
    
    res.status(201).json(game);
  } catch (error) {
    console.error('❌ Error creating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game details
router.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id, {
      include: [
        {
          model: Question,
          as: 'questions',
          attributes: ['id', 'question_text', 'correct_answer', 'question_order']
        },
        {
          model: GamePlayer,
          as: 'players',
          include: [{
            model: User,
            attributes: ['nickname', 'whatsapp_number']
          }]
        }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('❌ Error getting game details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game status
router.patch('/games/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const game = await Game.findByPk(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    game.status = status;
    await game.save();
    
    res.json(game);
  } catch (error) {
    console.error('❌ Error updating game status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get queue stats
router.get('/queues', async (req, res) => {
  try {
    const queueService = require('../services/queueService');
    const stats = await queueService.getQueueStats();
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear queues
router.post('/queues/clear', async (req, res) => {
  try {
    const queueService = require('../services/queueService');
    await queueService.clearQueues();
    
    res.json({ message: 'Queues cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing queues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add questions to a game
router.post('/games/:id/questions', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Create questions
    const createdQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      const question = await Question.create({
        game_id: gameId,
        question_text: questionData.question_text,
        option_a: questionData.option_a,
        option_b: questionData.option_b,
        option_c: questionData.option_c,
        option_d: questionData.option_d,
        correct_answer: questionData.correct_answer,
        question_order: i + 1
      });
      createdQuestions.push(question);
    }
    
    res.status(201).json(createdQuestions);
  } catch (error) {
    console.error('❌ Error adding questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start game registration
router.post('/games/:id/register', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Update game status to pre_game
    game.status = 'pre_game';
    await game.save();
    
    // Send game announcement to all users
    const notificationService = require('../services/notificationService');
    await notificationService.sendGameAnnouncement(gameId);
    
    // Schedule reminders
    await notificationService.scheduleGameReminders(gameId);
    
    const users = await User.count({ where: { is_active: true } });
    
    res.json({ 
      message: 'Registration started', 
      userCount: users,
      gameId: gameId,
      startTime: game.start_time,
      prizePool: game.prize_pool
    });
  } catch (error) {
    console.error('❌ Error starting registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a game
router.post('/games/:id/start', async (req, res) => {
  try {
    const gameId = req.params.id;
    const gameService = require('../services/gameService');
    
    const game = await Game.findByPk(gameId, {
      include: [
        { model: Question, as: 'questions' },
        { model: GamePlayer, as: 'players' }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.questions.length === 0) {
      return res.status(400).json({ error: 'Game must have questions before starting' });
    }
    
    if (game.players.length === 0) {
      return res.status(400).json({ error: 'Game must have players before starting' });
    }
    
    // Start the game
    await gameService.startGame(gameId);
    
    res.json({ message: 'Game started successfully', gameId });
  } catch (error) {
    console.error('❌ Error starting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all questions for a game
router.get('/games/:id/questions', async (req, res) => {
  try {
    const gameId = req.params.id;
    const questions = await Question.findAll({
      where: { game_id: gameId },
      order: [['question_order', 'ASC']]
    });
    
    res.json(questions);
  } catch (error) {
    console.error('❌ Error getting questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export game results as CSV
router.get('/games/:id/export', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: GamePlayer,
          as: 'players',
          include: [{ model: User, as: 'user' }]
        },
        {
          model: PlayerAnswer,
          as: 'answers',
          include: [
            { model: User, as: 'user' },
            { model: Question, as: 'question' }
          ]
        }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Generate CSV content
    let csv = 'Player,Question,Answer,Correct,Timestamp\n';
    
    for (const answer of game.answers) {
      csv += `"${answer.user.nickname}","${answer.question.question_text}","${answer.answer}","${answer.is_correct ? 'Yes' : 'No'}","${answer.created_at}"\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="game-${gameId}-results.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('❌ Error exporting game results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
