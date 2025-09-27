const express = require('express');
const router = express.Router();
const { User, Game, Question, GamePlayer, PlayerAnswer } = require('../models');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

// Send test message
router.post('/send-message', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }
    
    const queueService = require('../services/queueService');
    const job = await queueService.addMessage('send_message', {
      to: to,
      message: message
    });
    
    if (job) {
      res.json({ 
        success: true, 
        message: 'Message queued successfully',
        jobId: job.id 
      });
    } else {
      res.status(500).json({ error: 'Failed to queue message' });
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fix user registration
router.post('/fix-user-registration', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Missing required field: phoneNumber' });
    }
    
    const user = await User.findByWhatsAppNumber(phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Fix registration status
    user.registration_completed = true;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User registration fixed',
      user: {
        id: user.id,
        nickname: user.nickname,
        whatsapp_number: user.whatsapp_number,
        registration_completed: user.registration_completed
      }
    });
  } catch (error) {
    console.error('❌ Error fixing user registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      attributes: ['id', 'nickname', 'whatsapp_number', 'is_active', 'createdAt', 'last_activity'],
      order: [['createdAt', 'DESC']]
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
      order: [['createdAt', 'DESC']]
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

    // Schedule reminders for the new game
    const notificationService = require('../services/notificationService');
    await notificationService.scheduleGameReminders(game.id);
    
    console.log(`✅ Game created and reminders scheduled: ${game.id}`);
    
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

// Webhook monitoring - store recent webhook calls
let webhookLogs = [];
const MAX_WEBHOOK_LOGS = 50;

// Add webhook log entry
const addWebhookLog = (data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: data.entry?.[0]?.changes?.[0]?.field || 'unknown',
    from: data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || 'system',
    message: data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || 
             data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || 
             'No message content',
    status: data.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.status || 'message',
    rawData: data
  };
  
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > MAX_WEBHOOK_LOGS) {
    webhookLogs = webhookLogs.slice(0, MAX_WEBHOOK_LOGS);
  }
};

// Get webhook logs
router.get('/webhook-logs', async (req, res) => {
  try {
    res.json({
      logs: webhookLogs,
      count: webhookLogs.length,
      maxLogs: MAX_WEBHOOK_LOGS
    });
  } catch (error) {
    console.error('❌ Error getting webhook logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear webhook logs
router.post('/webhook-logs/clear', async (req, res) => {
  try {
    webhookLogs = [];
    res.json({ message: 'Webhook logs cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing webhook logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export webhook monitoring function
module.exports.addWebhookLog = addWebhookLog;





// Import questions from CSV file
router.post('/games/:id/questions/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    const gameId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const questions = [];
    const errors = [];
    
    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        // Validate required fields
        const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
        const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
        
        if (missingFields.length > 0) {
          errors.push(`Row ${questions.length + 1}: Missing fields: ${missingFields.join(', ')}`);
          return;
        }
        
        // Validate correct answer is one of the options
        const options = [row.option_a, row.option_b, row.option_c, row.option_d];
        if (!options.includes(row.correct_answer)) {
          errors.push(`Row ${questions.length + 1}: Correct answer must be one of the options`);
          return;
        }
        
        questions.push({
          question_text: row.question_text.trim(),
          option_a: row.option_a.trim(),
          option_b: row.option_b.trim(),
          option_c: row.option_c.trim(),
          option_d: row.option_d.trim(),
          correct_answer: row.correct_answer.trim()
        });
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          
          if (questions.length === 0) {
            return res.status(400).json({ 
              error: 'No valid questions found in CSV file',
              details: errors
            });
          }
          
          // Create questions in database
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
          
          res.json({
            message: `${createdQuestions.length} questions imported successfully`,
            imported: createdQuestions.length,
            errors: errors.length > 0 ? errors : undefined,
            questions: createdQuestions
          });
          
        } catch (error) {
          console.error('❌ Error creating questions from CSV:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      })
      .on('error', (error) => {
        console.error('❌ Error parsing CSV:', error);
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Error parsing CSV file' });
      });
      
  } catch (error) {
    console.error('❌ Error importing CSV:', error);
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start game registration (JOIN-only mode)
router.post('/games/:id/register', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Update game status to pre_game - users must now send "JOIN" to register
    game.status = 'pre_game';
    await game.save();
    
    // Notify all active users that a new game is available for registration
    const { User } = require('../models');
    const queueService = require('../services/queueService');
    
    const users = await User.findAll({ where: { is_active: true } });
    const gameTime = new Date(game.start_time).toLocaleString();
    
    for (const user of users) {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: `🎮 New QRush Trivia Game Available!

⏰ Game starts at: ${gameTime}
💰 Prize pool: $${game.prize_pool}

Reply "JOIN" to register for this game!
Only registered players will receive game notifications.`
      });
    }
    
    console.log(`✅ Game ${gameId} is now accepting JOIN registrations`);
    console.log(`📢 Notified ${users.length} users about game registration`);
    
    res.json({ 
      message: 'Game registration opened - users must send "JOIN" to register', 
      gameId: gameId,
      startTime: game.start_time,
      prizePool: game.prize_pool,
      registrationMode: 'JOIN_ONLY',
      usersNotified: users.length
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

// Force end a game (admin function)
router.post('/games/:id/end', async (req, res) => {
  try {
    const gameId = req.params.id;
    const gameService = require('../services/gameService');
    
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'in_progress') {
      return res.status(400).json({ error: 'Game is not in progress' });
    }
    
    // Force end the game
    const result = await gameService.forceEndGame(gameId);
    
    res.json({ 
      message: 'Game ended successfully', 
      gameId,
      winners: result.winners,
      winnerCount: result.winnerCount
    });
  } catch (error) {
    console.error('❌ Error ending game:', error);
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
          model: Question,
          as: 'questions',
          order: [['question_order', 'ASC']]
        }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get all player answers for this game
    const playerAnswers = await PlayerAnswer.findAll({
      where: { game_id: gameId },
      include: [
        { model: User, as: 'user' },
        { model: Question, as: 'question' }
      ],
      order: [
        [{ model: User, as: 'user' }, 'nickname', 'ASC'],
        ['question_number', 'ASC']
      ]
    });

    // Generate comprehensive CSV content
    let csv = '';
    
    // Game Summary Section
    csv += 'GAME SUMMARY\n';
    csv += `Game ID,${game.id}\n`;
    csv += `Status,${game.status}\n`;
    csv += `Start Time,${game.start_time}\n`;
    csv += `End Time,${game.end_time || 'N/A'}\n`;
    csv += `Prize Pool,$${game.prize_pool}\n`;
    csv += `Total Players,${game.players.length}\n`;
    csv += `Total Questions,${game.questions.length}\n`;
    csv += `Winner Count,${game.winner_count || 0}\n`;
    csv += `Prize Per Winner,${game.winner_count > 0 ? `$${(game.prize_pool / game.winner_count).toFixed(2)}` : 'N/A'}\n`;
    csv += '\n';
    
    // Player Summary Section
    csv += 'PLAYER SUMMARY\n';
    csv += 'Nickname,WhatsApp Number,Status,Elimination Round,Final Position\n';
    
    const playersWithAnswers = game.players.map(player => {
      const playerAnswersForGame = playerAnswers.filter(pa => pa.user_id === player.user_id);
      const lastCorrectAnswer = playerAnswersForGame.filter(pa => pa.is_correct).pop();
      const eliminationRound = lastCorrectAnswer ? lastCorrectAnswer.question.question_order + 1 : 1;
      
      return {
        nickname: player.user.nickname,
        whatsapp: player.user.whatsapp_number,
        status: player.status,
        eliminationRound: player.status === 'eliminated' ? eliminationRound : game.questions.length,
        position: player.status === 'winner' ? 'Winner' : `Eliminated Round ${eliminationRound}`
      };
    });
    
    playersWithAnswers.forEach(player => {
      csv += `"${player.nickname}","${player.whatsapp}","${player.status}","${player.eliminationRound}","${player.position}"\n`;
    });
    
    csv += '\n';
    
    // Detailed Answers Section
    csv += 'DETAILED ANSWERS\n';
    csv += 'Nickname,Question Number,Question Text,Player Answer,Correct Answer,Is Correct,Response Time\n';
    
    playerAnswers.forEach(answer => {
      const responseTime = answer.response_time_ms ? 
        `${answer.response_time_ms}ms` : 'N/A';
      
      csv += `"${answer.user.nickname}","${answer.question_number}","${answer.question.question_text}","${answer.selected_answer}","${answer.question.correct_answer}","${answer.is_correct ? 'Yes' : 'No'}","${responseTime}"\n`;
    });
    
    csv += '\n';
    
    // Winners Section (if game is finished)
    if (game.status === 'finished' && game.winner_count > 0) {
      csv += 'WINNERS\n';
      csv += 'Nickname,WhatsApp Number,Prize Amount\n';
      
      const winners = game.players.filter(p => p.status === 'winner');
      const prizePerWinner = (game.prize_pool / game.winner_count).toFixed(2);
      
      winners.forEach(winner => {
        csv += `"${winner.user.nickname}","${winner.user.whatsapp_number}","$${prizePerWinner}"\n`;
      });
    }
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="qrush-trivia-game-${gameId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('❌ Error exporting game results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
