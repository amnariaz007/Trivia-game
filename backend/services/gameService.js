const { Game, User, Question, GamePlayer, PlayerAnswer } = require('../models');
const queueService = require('./queueService');
const logger = require('../utils/logger');
const rewardService = require('./rewardService');
const whatsappService = require('./whatsappService');
const CircuitBreaker = require('./circuitBreaker');
const RedisGameState = require('./redisGameState');

class GameService {
  constructor() {
    this.activeGames = new Map(); // In-memory game state (fallback)
    this.redisGameState = new RedisGameState(); // Redis game state (primary)
    this.circuitBreaker = new CircuitBreaker();
    this.activeTimers = new Map(); // Store timer objects in memory (not in Redis)
    console.log('✅ Circuit Breaker initialized for GameService');
    console.log('✅ Redis Game State initialized for GameService');
    console.log('✅ Active Timers Map initialized for GameService');
    console.log('✅ No grace period - strict 10 second timer');
  }

  /**
   * Get game state (Redis first, then in-memory fallback)
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} Game state
   */
  async getGameState(gameId) {
    // Try Redis first
    if (this.redisGameState.isAvailable()) {
      const redisState = await this.redisGameState.getGameState(gameId);
      if (redisState) {
        return redisState;
      }
    }
    
    // Fallback to in-memory
    return this.activeGames.get(gameId) || null;
  }

  /**
   * Set game state (Redis first, then in-memory fallback)
   * @param {string} gameId - Game ID
   * @param {Object} gameState - Game state
   * @returns {Promise<boolean>} Success status
   */
  async setGameState(gameId, gameState) {
    // Try Redis first
    if (this.redisGameState.isAvailable()) {
      const success = await this.redisGameState.setGameState(gameId, gameState);
      if (success) {
        return true;
      }
    }
    
    // Fallback to in-memory
    this.activeGames.set(gameId, gameState);
    return true;
  }

  // Restore active games from database on server startup
  async restoreActiveGames() {
    try {
      console.log('🔄 Restoring active games from database...');
      
      // First, ensure database tables exist
      const { sequelize } = require('../config/database');
      await sequelize.sync({ force: false }); // Create tables if they don't exist
      console.log('✅ Database tables synchronized');
      
      const activeGames = await Game.findAll({
        where: { status: 'in_progress' },
        include: [
          { model: Question, as: 'questions', order: [['question_order', 'ASC']] },
          { 
            model: GamePlayer, 
            as: 'players',
            include: [{ model: User, as: 'user' }]
          }
        ]
      });

      for (const game of activeGames) {
        console.log(`🔄 Restoring game: ${game.id}`);
        
        // Convert database models to in-memory format
        const gameState = {
          id: game.id,
          status: game.status,
          currentQuestion: game.current_question || 0,
          questions: game.questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            time_limit: q.time_limit || 10
          })),
          players: game.players.map(p => ({
            user: {
              id: p.user.id,
              nickname: p.user.nickname,
              whatsapp_number: p.user.whatsapp_number
            },
            status: p.status,
            answer: null, // Reset answers since we can't restore them
            answerTime: null
          })),
          startTime: game.start_time || new Date(),
          questionTimer: null
        };

        // Store in Redis as primary, in-memory as fallback
        await this.setGameState(game.id, gameState);
        console.log(`✅ Restored game ${game.id} with ${gameState.players.length} players`);
        
        // If game was in progress, restart the question timer
        if (gameState.status === 'in_progress' && gameState.currentQuestion < gameState.questions.length) {
          console.log(`🔄 Restarting question timer for restored game ${game.id}`);
          // Don't restart timer immediately, let the game continue from where it left off
          // The next question will be started when the current one times out or all players answer
        }
      }

      console.log(`✅ Restored ${activeGames.length} active games`);
      
    } catch (error) {
      console.log("game  restoreee errorrrr  1");
      console.error('❌ Error restoring active games:', error);
    }
  }

  // Generate timer bar visualization
  // Timer bar function removed - no more timer notifications

  // Clear terminal for easier debugging
  clearTerminal() {
    // Clear terminal using ANSI escape codes
    process.stdout.write('\x1B[2J\x1B[0f');
    console.log('🧹 Terminal cleared for new game debugging');
    console.log('='.repeat(80));
    console.log('🎮 NEW GAME STARTING - CLEAN LOGS');
    console.log('='.repeat(80));
  }

  // Clear stale Redis keys that might cause games to get stuck
  async clearStaleGameKeys(gameId) {
    try {
      const queueService = require('./queueService');
      if (!queueService.redis) {
        console.log('⚠️ Redis not available for clearing stale keys');
        return;
      }

      console.log(`🧹 Clearing stale Redis keys for game ${gameId}...`);
      
      // Clear result_decided keys for this game
      const resultKeys = await queueService.redis.keys(`result_decided:${gameId}:*`);
      if (resultKeys.length > 0) {
        await queueService.redis.del(...resultKeys);
        console.log(`🗑️ Cleared ${resultKeys.length} stale result_decided keys`);
      }

      // Clear any other game-specific keys that might cause issues
      const gameKeys = await queueService.redis.keys(`*:${gameId}:*`);
      if (gameKeys.length > 0) {
        console.log(`🔍 Found ${gameKeys.length} game-specific keys, clearing potentially stale ones...`);
        for (const key of gameKeys) {
          // Only clear keys that might cause processing issues
          if (key.includes('result_decided') || key.includes('question_sent')) {
            await queueService.redis.del(key);
            console.log(`🗑️ Cleared stale key: ${key}`);
          }
        }
      }

      console.log(`✅ Stale Redis keys cleared for game ${gameId}`);
    } catch (error) {
      console.error('❌ Error clearing stale Redis keys:', error);
    }
  }

  // Start a new game
  async startGame(gameId) {
    try {
      // Clear terminal for easier debugging
      this.clearTerminal();
      
      // Clear any stale Redis keys from previous games
      await this.clearStaleGameKeys(gameId);
      
      // Circuit breaker protection for game start
      if (!this.circuitBreaker.canExecute('startGame')) {
        throw new Error('Game service is temporarily unavailable due to high error rate');
      }
      const game = await Game.findByPk(gameId, {
        include: [
          { model: Question, as: 'questions' },
          { model: GamePlayer, as: 'players', include: [{ model: User, as: 'user' }] }
        ]
      });

      if (!game) {
        throw new Error('Game not found');
      }

      // Update game status
      game.status = 'in_progress';
      game.start_time = new Date();
      await game.save();

      // Only include players who have actively joined (status: 'registered' or 'alive')
      const activePlayers = game.players.filter(player => 
        player.status === 'registered' || player.status === 'alive'
      );

      if (activePlayers.length === 0) {
        throw new Error('No players have joined this game. Game cannot start.');
      }

      // Update all joined players to 'alive' status in database
      await GamePlayer.update(
        { status: 'alive' },
        { 
          where: { 
            game_id: gameId,
            status: 'registered'
          } 
        }
      );

      // Initialize game state with proper structure
      const gameState = {
        id: gameId,
        gameId,
        status: 'in_progress',
        currentQuestion: 0,
        questions: game.questions,
        players: activePlayers.map(player => ({
          ...player.toJSON(),
          status: 'alive',
          answer: null,
          answerTime: null,
          eliminatedAt: null,
          eliminatedOnQuestion: null,
          eliminationReason: null
        })),
        startTime: new Date(),
        questionTimer: null,
        activeTimers: new Set()
      };

      await this.setGameState(gameId, gameState);
      console.log(`✅ Game state initialized and saved to Redis for game ${gameId}`);

      // Send game start message to all players
      await this.sendGameStartMessage(gameId);

      // Start first question after 30 seconds
      setTimeout(() => {
        console.log(`🚀 Starting first question for game ${gameId} after 30 second delay`);
        this.startQuestion(gameId, 0);
      }, 30000);

      console.log(`🎮 Game ${gameId} started with ${gameState.players.length} players`);
      
      // Record success in circuit breaker
      this.circuitBreaker.recordSuccess('startGame');
      return gameState;

    } catch (error) {
      console.error('❌ Error starting game:', error);
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure('startGame');
      throw error;
    }
  }

  // Start a specific question
  async startQuestion(gameId, questionIndex) {
    // Declare lockKey outside try block to fix scope issue
    let lockKey = null;
    
    try {
      console.log(`🎯 startQuestion called: gameId=${gameId}, questionIndex=${questionIndex}`);
      
      // Use Redis lock to prevent race conditions
      lockKey = `game_lock:${gameId}:question:${questionIndex}`;
      const lockAcquired = await this.acquireLock(lockKey, 30); // 30 second lock
      
      if (!lockAcquired) {
        console.log(`⚠️ Could not acquire lock for game ${gameId} question ${questionIndex}, skipping`);
        return;
      }

      // Check if this question is already being processed to prevent duplication
      const processingKey = `question_processing:${gameId}:${questionIndex}`;
      const isProcessing = await queueService.redis?.get(processingKey);
      if (isProcessing) {
        console.log(`⚠️ Question ${questionIndex + 1} already being processed, skipping duplicate`);
        return;
      }
      
      // Mark as processing to prevent duplicates
      await queueService.redis?.setex(processingKey, 30, 'processing');

      // Get current game state
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`❌ Game state not found for ${gameId}`);
        await this.releaseLock(lockKey);
        return;
      }

      console.log(`🔍 Game state found: currentQuestion=${gameState.currentQuestion}, questionIndex=${questionIndex}, players=${gameState.players?.length || 0}`);

      // Check if a question is already running
      if (gameState.questionTimer) {
        console.log(`⚠️ Question timer already running for game ${gameId}, stopping previous timer`);
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
      }

      // Check if we're already on this question (but allow the first question to start)
      if (gameState.currentQuestion > questionIndex) {
        console.log(`⚠️ Question ${questionIndex + 1} already processed or passed, skipping`);
        await this.releaseLock(lockKey);
        return;
      }

      console.log(`✅ Question ${questionIndex + 1} is valid to start, proceeding...`);

      const { questions, players } = gameState;

      if (questionIndex >= questions.length) {
        // Game finished
        console.log(`🏁 All questions completed for game ${gameId}`);
        await this.endGame(gameId);
        return;
      }

      const question = questions[questionIndex];
      gameState.currentQuestion = questionIndex;
      
      // Reset player answer states for new question
      for (const player of players) {
        if (player.status === 'alive') {
          player.answer = null;
          player.answerTime = null;
          player.resultProcessed = false; // Reset result processing flag for new question
        }
      }

      // Update game in database with null check
      const game = await Game.findByPk(gameId);
      if (!game) {
        console.error(`❌ Game not found in database: ${gameId}`);
        throw new Error(`Game ${gameId} not found in database`);
      }
      
      game.current_question = questionIndex;
      await game.save();

      // Set question start time FIRST (before any delays)
      gameState.questionStartTime = new Date();
      console.log(`⏰ Question ${questionIndex + 1} start time set: ${gameState.questionStartTime.toISOString()}`);
      
      // Save updated game state to Redis
      await this.setGameState(gameId, gameState);

      // Start countdown timer IMMEDIATELY (don't wait for question sending)
      await this.startQuestionTimer(gameId, questionIndex, 10);

      // Send question to all alive players (non-blocking)
      console.log(`📤 Sending question ${questionIndex + 1} to ${players.filter(p => p.status === 'alive').length} alive players`);
      
      // Send questions asynchronously (don't await)
      const sendPromises = [];
      for (const player of players) {
        if (player.status === 'alive') {
          console.log(`📤 Sending question ${questionIndex + 1} to ${player.user.nickname} (${player.user.whatsapp_number})`);
          
          // Send question directly for better reliability
          const sendPromise = (async () => {
            try {
              const whatsappService = require('./whatsappService');
              await whatsappService.sendQuestion(
                player.user.whatsapp_number,
                question.question_text,
                [question.option_a, question.option_b, question.option_c, question.option_d],
                questionIndex + 1,
                question.correct_answer
              );
              console.log(`✅ Question sent to ${player.user.nickname}`);
            } catch (error) {
              console.error(`❌ Failed to send question to ${player.user.nickname}:`, error);
              // Try queue as fallback
              try {
                const job = await queueService.addMessage('send_question', {
                  to: player.user.whatsapp_number,
                  gameId,
                  questionNumber: questionIndex + 1,
                  questionText: question.question_text,
                  options: [question.option_a, question.option_b, question.option_c, question.option_d],
                  correctAnswer: question.correct_answer,
                  timeLimit: 10
                });
                console.log(`📤 Queue fallback for ${player.user.nickname}:`, job ? 'SUCCESS' : 'FAILED');
              } catch (queueError) {
                console.error(`❌ Queue fallback also failed for ${player.user.nickname}:`, queueError);
              }
            }
          })();
          
          sendPromises.push(sendPromise);
        }
      }
      
      // Don't wait for question sending to complete
      console.log(`📤 Question sending started for ${sendPromises.length} players (non-blocking)`);

      console.log(`❓ Question ${questionIndex + 1} started for game ${gameId}`);

      // Release lock after successful completion
      await this.releaseLock(lockKey);

    } catch (error) {
      console.error('❌ Error starting question:', error);
      // Release lock on error if it was acquired
      if (lockKey) {
        await this.releaseLock(lockKey);
      }
      throw error;
    }
  }

  // Start question timer with countdown reminders
  async startQuestionTimer(gameId, questionIndex, totalSeconds) {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    // Clear any existing timers for this question
    const timerKey = `${gameId}:${questionIndex}`;
    if (this.activeTimers && this.activeTimers.has(timerKey)) {
      console.log(`🔄 Clearing existing timers for question ${questionIndex + 1}`);
      const timers = this.activeTimers.get(timerKey);
      if (timers.questionTimer) clearTimeout(timers.questionTimer);
      if (timers.countdownTimers) {
        timers.countdownTimers.forEach(timer => clearTimeout(timer));
      }
      this.activeTimers.delete(timerKey);
    }

    console.log(`⏰ Starting timer for question ${questionIndex + 1} (${totalSeconds}s) with countdown reminders at ${new Date().toISOString()}`);

    // Schedule 5-second reminder
    const reminder5s = setTimeout(async () => {
      console.log(`⏰ 5s reminder firing at ${new Date().toISOString()}`);
      await this.sendCountdownReminder(gameId, questionIndex, 5);
    }, 5000);

    // Main timeout (exactly 10 seconds)
    const mainTimer = setTimeout(async () => {
      console.log(`⏰ Question ${questionIndex + 1} time expired - processing timeout`);
      await this.handleQuestionTimeout(gameId, questionIndex);
    }, 10000); // Exactly 10 seconds

    // Store timer IDs instead of timer objects (to avoid circular structure)
    gameState.questionTimerId = mainTimer[Symbol.toPrimitive] ? mainTimer[Symbol.toPrimitive]() : mainTimer.toString();
    gameState.countdownTimerIds = [reminder5s].map(timer => 
      timer[Symbol.toPrimitive] ? timer[Symbol.toPrimitive]() : timer.toString()
    );
    
    // Store actual timer objects in memory (not in Redis)
    if (!this.activeTimers) this.activeTimers = new Map();
    this.activeTimers.set(`${gameId}:${questionIndex}`, {
      questionTimer: mainTimer,
      countdownTimers: [reminder5s]
    });
    
    // Save updated game state (without timer objects)
    await this.setGameState(gameId, gameState);
  }

  // Send countdown reminder to alive players who haven't answered
  async sendCountdownReminder(gameId, questionIndex, secondsLeft) {
    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`❌ Game state not found for countdown reminder: gameId=${gameId}, question=${questionIndex + 1}, secondsLeft=${secondsLeft}`);
        return;
      }

      // Check if question is still active (not already processed)
      if (gameState.currentQuestion > questionIndex) {
        console.log(`⏰ Skipping ${secondsLeft}s reminder - question ${questionIndex + 1} already processed (current: ${gameState.currentQuestion + 1})`);
        return;
      }

      // Get fresh game state to ensure we have latest player statuses
      const freshGameState = await this.getGameState(gameId);
      const alivePlayers = freshGameState.players.filter(p => p.status === 'alive');
      const playersNeedingReminder = alivePlayers.filter(p => !p.answer || p.answer.trim() === '');

      console.log(`⏰ [COUNTDOWN] Game ${gameId} Q${questionIndex + 1}: Sending ${secondsLeft}s reminder to ${playersNeedingReminder.length}/${alivePlayers.length} players`);
      console.log(`⏰ [COUNTDOWN] Players needing reminder: ${playersNeedingReminder.map(p => p.user.nickname).join(', ')}`);

      let remindersSent = 0;
      let duplicatesSkipped = 0;
      let eliminatedSkipped = 0;

      for (const player of playersNeedingReminder) {
        // Double-check player is still alive before sending (prevent race conditions)
        const currentPlayer = freshGameState.players.find(p => p.user.whatsapp_number === player.user.whatsapp_number);
        if (!currentPlayer || currentPlayer.status !== 'alive') {
          eliminatedSkipped++;
          console.log(`⏰ [COUNTDOWN] Skipped ${secondsLeft}s reminder for ${player.user.nickname} - player eliminated`);
          continue;
        }

        // Check if reminder already sent to prevent duplicates
        const reminderKey = `reminder_sent:${gameId}:${questionIndex}:${secondsLeft}:${player.user.whatsapp_number}`;
        const alreadySent = await queueService.redis?.get(reminderKey);
        
        if (!alreadySent) {
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: `• ${secondsLeft} seconds left to answer`,
            gameId: gameId,
            messageType: 'countdown_reminder'
          });
          
          // Mark as sent with short expiration
          await queueService.redis?.setex(reminderKey, 30, 'sent');
          remindersSent++;
          console.log(`⏰ [COUNTDOWN] Sent ${secondsLeft}s reminder to ${player.user.nickname}`);
        } else {
          duplicatesSkipped++;
          console.log(`⏰ [COUNTDOWN] Skipped duplicate ${secondsLeft}s reminder for ${player.user.nickname}`);
        }
      }

      console.log(`⏰ [COUNTDOWN] Summary: ${remindersSent} sent, ${duplicatesSkipped} duplicates skipped, ${eliminatedSkipped} eliminated skipped for ${secondsLeft}s reminder`);
    } catch (error) {
      console.error(`❌ Error sending ${secondsLeft}s countdown reminder for game ${gameId} Q${questionIndex + 1}:`, error);
    }
  }

  // Handle late answer elimination
  async handleLateAnswerElimination(gameId, phoneNumber, timeSinceQuestionStart) {
    try {
      console.log(`⏰ Handling late answer elimination for ${phoneNumber} in game ${gameId}`);
      
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`❌ Game ${gameId} not found for late answer elimination`);
        return;
      }

      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (!player || player.status !== 'alive') {
        console.log(`❌ Player ${phoneNumber} not found or not alive for late answer elimination`);
        return;
      }

      // Mark player as eliminated
      player.status = 'eliminated';
      player.eliminatedAt = new Date();
      player.eliminatedOnQuestion = gameState.currentQuestion + 1;
      player.eliminationReason = 'late_answer';
      
      // Update database
      await GamePlayer.update(
        { 
          status: 'eliminated',
          eliminated_at: new Date(),
          eliminated_by_question: gameState.currentQuestion + 1
        },
        { 
          where: { 
            game_id: gameId,
            user_id: player.user.id 
          } 
        }
      );

      console.log(`❌ Player ${player.user.nickname} eliminated due to late answer on Q${gameState.currentQuestion + 1}`);

      // Save updated game state
      await this.setGameState(gameId, gameState);

      // Send elimination message with full details
      await queueService.addMessage('send_message', {
        to: player.user.whatsapp_number,
        message: `⏰ Too late! You answered after the question timer ended and have been eliminated.

❌ Eliminated on: Question ${gameState.currentQuestion + 1}
🎮 Game: ${gameId.slice(0, 8)}...
⏰ You responded after the timer ended.

Stick around to watch the finish! Reply "PLAY" for the next game.`,
        gameId: gameId,
        messageType: 'late_elimination',
        questionIndex: gameState.currentQuestion
      });

      // Check if game should end (all players eliminated)
      const alivePlayers = gameState.players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated due to late answers, ending game ${gameId}`);
        await this.endGame(gameId);
        return;
      }

    } catch (error) {
      console.error('❌ Error handling late answer elimination:', error);
    }
  }

    // Handle player answer
  async handlePlayerAnswer(gameId, phoneNumber, answer) {
    let lockKey = null; // Declare lockKey outside try block
    try {
      console.log(`🎯 [GAME_SERVICE] handlePlayerAnswer called: gameId=${gameId}, phone=${phoneNumber}, answer="${answer}" at ${new Date().toISOString()}`);
      
      // Use Redis lock to prevent race conditions when multiple players answer simultaneously
      lockKey = `game_lock:${gameId}:answer:${phoneNumber}`;
      const lockAcquired = await this.acquireLock(lockKey, 10); // 10 second lock
      
      if (!lockAcquired) {
        console.log(`⚠️ Could not acquire lock for player ${phoneNumber} in game ${gameId}, skipping`);
        return;
      }

      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        await this.releaseLock(lockKey);
        console.log(`❌ Game not found: ${gameId}`);
        throw new Error('Game not found or not active');
      }

      // Check if the question is still active (exactly 10 seconds)
      const questionStartTime = gameState.questionStartTime instanceof Date ? gameState.questionStartTime : new Date(gameState.questionStartTime);
      const timeSinceQuestionStart = Date.now() - questionStartTime.getTime();
      const questionDuration = 10000; // 10 seconds question duration
      const maxAnswerTime = questionDuration; // No grace period - exactly 10 seconds
      
      if (timeSinceQuestionStart > maxAnswerTime) {
        console.log(`⏰ Answer too late for ${phoneNumber} - ${timeSinceQuestionStart}ms since question start (max: ${maxAnswerTime}ms)`);
        
        // Check if player was already eliminated by timeout
        const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
        if (player && player.status === 'eliminated') {
          console.log(`🔄 Player ${phoneNumber} already eliminated, skipping late answer elimination`);
          await this.releaseLock(lockKey);
          return { message: 'already_eliminated' };
        }
        
        // Immediately eliminate player for late answer
        await this.handleLateAnswerElimination(gameId, phoneNumber, timeSinceQuestionStart);
        
        await this.releaseLock(lockKey);
        return { message: 'answer_too_late_eliminated' };
      }
      
      console.log(`✅ Answer from ${phoneNumber} is within time window: ${timeSinceQuestionStart}ms since question start (max allowed: ${maxAnswerTime}ms)`);

      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (!player) {
        console.log(`❌ Player not found: ${phoneNumber}`);
        throw new Error('Player not found in game');
      }

      console.log(`👤 Player found: ${player.user.nickname}, status: ${player.status}, hasAnswer: ${!!player.answer}`);

      if (player.status !== 'alive') {
        console.log(`❌ Player not alive: ${player.status}`);
        throw new Error('Player not active in game');
      }

      // Record the answer normally
      player.answer = answer;
      player.answerTime = Date.now();
      player.resultProcessed = false; // Mark that result hasn't been processed yet
      console.log(`✅ Set player ${player.user.nickname} answer to: "${player.answer}"`);
      
      // Save immediately to prevent race conditions
      await this.setGameState(gameId, gameState);

      // Create answer lock key to prevent race conditions
      const answerLockKey = `player_answer:${gameId}:${phoneNumber}:${gameState.currentQuestion}`;
      
      // Acquire lock to prevent multiple answers
      const answerLockAcquired = await queueService.acquireLock(answerLockKey, 5);
      if (!answerLockAcquired) {
        console.log(`🔒 Answer lock not acquired for ${phoneNumber}, skipping duplicate answer`);
        // Clear processing flag if lock not acquired
        player.processingAnswer = false;
        await this.setGameState(gameId, gameState);
        return { message: 'duplicate_answer_skipped' };
      }

      try {
        // Get current question first
        const currentQuestion = gameState.questions[gameState.currentQuestion];
        if (!currentQuestion) {
          console.log(`❌ No current question found for game ${gameId}`);
          return { message: 'no_active_question' };
        }

        console.log(`🔍 [GAME_SERVICE] Current question details:`);
        console.log(`🔍 [GAME_SERVICE] - Question index: ${gameState.currentQuestion}`);
        console.log(`🔍 [GAME_SERVICE] - Question text: "${currentQuestion.question_text}"`);
        console.log(`🔍 [GAME_SERVICE] - Correct answer: "${currentQuestion.correct_answer}"`);
        console.log(`🔍 [GAME_SERVICE] - Total questions: ${gameState.questions.length}`);

        // Double-check if player already answered (with lock)
        if (player.answer) {
          console.log(`❌ Player already answered: ${player.answer}`);
          
          // Check if all players have answered and process results if needed
          const alivePlayers = gameState.players.filter(p => p.status === 'alive');
          const answeredPlayers = alivePlayers.filter(p => p.answer);
          
          if (answeredPlayers.length === alivePlayers.length && alivePlayers.length > 0) {
            console.log(`🎯 All players answered, clearing timer and processing results for already answered player`);
            
            // Clear timers using the new timer management system
            const timerKey = `${gameId}:${gameState.currentQuestion}`;
            if (this.activeTimers && this.activeTimers.has(timerKey)) {
              const timers = this.activeTimers.get(timerKey);
              if (timers.questionTimer) clearTimeout(timers.questionTimer);
              if (timers.countdownTimers) {
                timers.countdownTimers.forEach(timer => clearTimeout(timer));
              }
              this.activeTimers.delete(timerKey);
              console.log(`⏰ Cleared all timers - all players answered (already answered case)`);
            }
            
            setTimeout(async () => {
              console.log(`🚀 Processing question results for Q${gameState.currentQuestion + 1} (already answered)`);
              await this.processQuestionResultsWithLock(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
            }, 1000);
          }
          
          return {
            correct: player.answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim(),
            correctAnswer: currentQuestion.correct_answer,
            alreadyAnswered: true
          };
        }

        // Answer already set above, just verify
        const isCorrect = answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
        
        // Only log essential answer processing info
        logger.info(`✅ ${player.user.nickname}: "${answer}" -> ${isCorrect ? 'CORRECT' : 'WRONG'}`);

        // Save to database - first ensure game exists in database
        let gameExists = await Game.findByPk(gameId);
        if (!gameExists) {
          console.log(`⚠️ Game ${gameId} not found in database, creating it from Redis state`);
          try {
            // Create the game in database from Redis state
                  gameExists = await Game.create({
                    id: gameId,
                    status: 'in_progress',
                    current_question: gameState.currentQuestion,
                    total_questions: gameState.questions.length,
                    start_time: gameState.startTime instanceof Date ? gameState.startTime : new Date(gameState.startTime)
                  });
            console.log(`✅ Created game ${gameId} in database`);
          } catch (createError) {
            console.error(`❌ Failed to create game ${gameId} in database:`, createError);
            throw new Error(`Game ${gameId} not found in database and could not be created`);
          }
        }
        
        // Ensure user exists in database
        const userExists = await User.findByPk(player.user.id);
        if (!userExists) {
          console.log(`⚠️ User ${player.user.id} not found in database, creating from Redis state`);
          try {
            await User.create({
              id: player.user.id,
              whatsapp_number: player.user.whatsapp_number,
              nickname: player.user.nickname,
              is_active: true
            });
            console.log(`✅ Created user ${player.user.id} in database`);
          } catch (createError) {
            console.error(`❌ Failed to create user ${player.user.id} in database:`, createError);
            throw new Error(`User ${player.user.id} not found in database and could not be created`);
          }
        }
        
        const questionStartTime = gameState.questionStartTime instanceof Date ? gameState.questionStartTime : new Date(gameState.questionStartTime);
        await PlayerAnswer.create({
          game_id: gameId,
          user_id: player.user.id,
          question_id: currentQuestion.id,
          selected_answer: answer,
          is_correct: isCorrect,
          response_time_ms: Date.now() - questionStartTime.getTime(),
          question_number: gameState.currentQuestion + 1
        });

        console.log(`📝 Player ${player.user.nickname} answered: ${answer} (${isCorrect ? 'CORRECT' : 'WRONG'})`);

        // Send single confirmation message with deduplication
        const confirmDedupeKey = `confirm_sent:${gameId}:${gameState.currentQuestion}:${phoneNumber}`;
        const confirmAlreadySent = await queueService.redis?.get(confirmDedupeKey);
        
        if (!confirmAlreadySent) {
          await queueService.addMessage('send_message', {
            to: phoneNumber,
            message: `✅ Answer locked in! Please wait until the next round.`
          });
          
          // Mark as sent to prevent duplicates
          await queueService.redis?.setex(confirmDedupeKey, 60, 'sent');
        } else {
          console.log(`🔄 Skipping duplicate confirmation message for ${player.user.nickname}`);
        }
        
        console.log(`⏰ Player ${player.user.nickname} answered, timer will continue for other players only`);

        // Save updated game state to Redis after processing
        await this.setGameState(gameId, gameState);

        // Check if all alive players have answered
        const alivePlayers = gameState.players.filter(p => p.status === 'alive');
        const answeredPlayers = alivePlayers.filter(p => p.answer);
        
        console.log(`🔍 Answer check: ${answeredPlayers.length}/${alivePlayers.length} players answered`);
        console.log(`🔍 Answered players:`, answeredPlayers.map(p => `${p.user.nickname} (${p.answer})`));
        console.log(`🔍 Non-answered players:`, alivePlayers.filter(p => !p.answer).map(p => p.user.nickname));
        
        // Process results immediately when any player answers (sudden-death style)
        if (answeredPlayers.length > 0) {
          console.log(`🎯 ${answeredPlayers.length} players answered, processing results immediately (sudden-death mode)`);
          
          // Clear the timer since we're processing results now
          const timerKey = `${gameId}:${gameState.currentQuestion}`;
          if (this.activeTimers && this.activeTimers.has(timerKey)) {
            const timers = this.activeTimers.get(timerKey);
            if (timers.questionTimer) {
              clearTimeout(timers.questionTimer);
              console.log(`⏰ Cleared main timer - processing results immediately`);
            }
            if (timers.countdownTimers) {
              timers.countdownTimers.forEach(timer => clearTimeout(timer));
              console.log(`⏰ Cleared countdown timers - processing results immediately`);
            }
            this.activeTimers.delete(timerKey);
            console.log(`⏰ Removed timer entry for ${timerKey}`);
          }
          
          // Process results immediately for answered players
          setTimeout(async () => {
            console.log(`🚀 [GAME_SERVICE] Processing question results for Q${gameState.currentQuestion + 1} (${answeredPlayers.length} players answered)`);
            console.log(`🚀 [GAME_SERVICE] Calling processQuestionResultsWithLock with questionIndex=${gameState.currentQuestion}, correctAnswer="${currentQuestion.correct_answer}"`);
            await this.processQuestionResultsWithLock(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
            
            // Note: Players who didn't answer will be handled by the timeout handler
            console.log(`📊 [GAME_SERVICE] Processed results for ${answeredPlayers.length} players who answered Q${gameState.currentQuestion + 1}`);
          }, 1000); // Small delay to ensure answer is fully processed
        } else {
          console.log(`⏳ No players have answered yet, waiting for answers or timeout...`);
          // No players answered yet, continue waiting for answers or timeout
        }

        return {
          correct: isCorrect,
          correctAnswer: currentQuestion.correct_answer
        };

      } finally {
        // Always release the answer lock
        await queueService.releaseLock(answerLockKey);
        // Always release the main game lock
        await this.releaseLock(lockKey);
      }

    } catch (error) {
      console.error('❌ Error handling player answer:', error);
      // Simple error handling - no complex cleanup needed
      // Release the main game lock on error
      if (lockKey) {
        await this.releaseLock(lockKey);
      }
      throw error;
    }
  }

  // Send question to all alive players
  async sendQuestionToPlayers(gameId, question) {
    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) return;

      const options = [question.option_a, question.option_b, question.option_c, question.option_d];
      const questionNumber = gameState.currentQuestion + 1;

      for (const player of gameState.players) {
        if (player.status === 'alive') {
          await queueService.addMessage('send_question', {
            to: player.user.whatsapp_number,
            questionText: question.question_text,
            options,
            questionNumber,
            correctAnswer: question.correct_answer,
            gameId: gameId // Add gameId for deduplication
          });
        } else {
          // Send spectator update to eliminated players
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: `👀 Q${questionNumber}: ${question.question_text}\n\nYou're watching as a spectator.`,
            gameId: gameId,
            messageType: 'spectator'
          });
        }
      }

    } catch (error) {
      console.error('❌ Error sending question to players:', error);
    }
  }

  // Timer update function removed - no more timer notifications in chat

  // Handle question timeout - eliminate players who didn't answer
  async handleQuestionTimeout(gameId, questionIndex) {
    try {
      // Add delay to prevent race condition with answer processing
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      const gameState = await this.getGameState(gameId);
      if (!gameState) return;

      // Check if question has already been processed (moved to next question)
      if (gameState.currentQuestion > questionIndex) {
        console.log(`⏰ Question ${questionIndex + 1} already processed, skipping timeout`);
        return;
      }

      const { players, questions } = gameState;
      const question = questions[questionIndex];
      
      console.log(`⏰ Question ${questionIndex + 1} timeout - processing eliminations at ${new Date().toISOString()}`);

      // Check if timer was already cleared (meaning results were processed)
      const timerKey = `${gameId}:${questionIndex}`;
      if (!this.activeTimers || !this.activeTimers.has(timerKey)) {
        console.log(`🔄 Timer for Q${questionIndex + 1} was already cleared, skipping timeout elimination`);
        return;
      }

      // Check if all alive players have been processed (either answered or eliminated)
      const alivePlayersForTimeout = players.filter(p => p.status === 'alive');
      const processedPlayers = alivePlayersForTimeout.filter(p => p.resultProcessed || p.status === 'eliminated');
      
      if (processedPlayers.length === alivePlayersForTimeout.length && alivePlayersForTimeout.length > 0) {
        console.log(`🔄 All ${alivePlayersForTimeout.length} alive players have been processed for Q${questionIndex + 1}, skipping timeout elimination`);
        return;
      }


      // Find players who didn't answer (these should be eliminated by timeout)
      const playersWithoutAnswers = players.filter(p => p.status === 'alive' && (!p.answer || p.answer.trim() === ''));
      const playersWithAnswers = players.filter(p => p.status === 'alive' && p.answer);
      
      if (playersWithoutAnswers.length === 0) {
        console.log(`🔄 All alive players have answered Q${questionIndex + 1}, no timeout eliminations needed`);
        
        // If all players answered, check if we need to start the next question
        if (playersWithAnswers.length > 0) {
          console.log(`🎯 All ${playersWithAnswers.length} players answered Q${questionIndex + 1}, ensuring next question starts`);
          
          // Add a small delay to ensure all answer processing is complete
          setTimeout(() => {
            console.log(`🚀 [TIMEOUT_HANDLER] Ensuring next question starts for Q${questionIndex + 2}`);
            this.startQuestion(gameId, questionIndex + 1);
          }, 3000); // 3 second delay to ensure all processing is complete
        }
        return;
      }

      console.log(`⏰ ${playersWithoutAnswers.length} players didn't answer Q${questionIndex + 1}, processing timeout eliminations`);

      // Eliminate players who didn't answer
      for (const player of players) {
        console.log(`🔍 Checking player ${player.user.nickname}: status=${player.status}, answer="${player.answer}"`);
        
        // Only eliminate if player is alive AND has NO answer (timeout)
        if (player.status === 'alive' && (!player.answer || player.answer.trim() === '')) {
          // Eliminate player for not answering
          player.status = 'eliminated';
          player.eliminatedAt = new Date();
          player.eliminatedOnQuestion = questionIndex + 1;
          player.eliminationReason = 'timeout';

          // Update database
          await GamePlayer.update(
            { 
              status: 'eliminated',
              eliminated_at: new Date(),
              eliminated_by_question: questionIndex + 1
            },
            { 
              where: { 
                game_id: gameId,
                user_id: player.user.id 
              } 
            }
          );

          console.log(`⏰ Player ${player.user.nickname} eliminated for timeout on Q${questionIndex + 1}`);

          // Send timeout elimination message
          await queueService.addMessage('send_message', {
            to: player.user.whatsapp_number,
            message: `⏰ Time's up! You didn't answer in time and have been eliminated.

❌ Eliminated on: Question ${questionIndex + 1}
🎮 Game: ${gameId.slice(0, 8)}...
⏰ You didn't respond within the time limit.

Stick around to watch the finish! Reply "PLAY" for the next game.`,
            gameId: gameId,
            messageType: 'timeout_elimination',
            questionIndex: questionIndex
          });
        }
      }

      // Save updated game state after timeout eliminations
      await this.setGameState(gameId, gameState);

      // Check if game should end after timeout eliminations
      const alivePlayersAfterTimeout = gameState.players.filter(p => p.status === 'alive');
      
      if (alivePlayersAfterTimeout.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1} (timeout)`);
        await this.endGame(gameId);
        return;
      }

      if (questionIndex + 1 >= gameState.questions.length) {
        console.log(`🏁 Last question completed. ${alivePlayersAfterTimeout.length} survivors!`);
        await this.endGame(gameId);
        return;
      }

      // Check if any players answered correctly and need result processing
      const playersWithAnswersAfterTimeout = alivePlayersAfterTimeout.filter(p => p.answer && p.answer.trim() !== '');
      
      if (playersWithAnswersAfterTimeout.length > 0) {
        console.log(`🎯 ${playersWithAnswersAfterTimeout.length} players answered Q${questionIndex + 1}, processing results before next question`);
        
        // Process results for players who answered
        setTimeout(async () => {
          console.log(`🚀 [TIMEOUT_HANDLER] Processing results for Q${questionIndex + 1} (${playersWithAnswersAfterTimeout.length} players answered)`);
          await this.processQuestionResultsWithLock(gameId, questionIndex, question.correct_answer);
          
          // Then start next question
          setTimeout(() => {
            console.log(`🚀 Starting next question ${questionIndex + 2} for game ${gameId}`);
            this.startQuestion(gameId, questionIndex + 1);
          }, 2000);
        }, 1000);
      } else {
        // No players answered, start next question directly
        console.log(`⏭️  No players answered Q${questionIndex + 1}, starting next question directly. ${alivePlayersAfterTimeout.length} players alive`);
        setTimeout(() => {
          console.log(`🚀 Starting next question ${questionIndex + 2} for game ${gameId}`);
          this.startQuestion(gameId, questionIndex + 1);
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error handling question timeout:', error);
    }
  }

  // Handle player elimination due to 24-hour window expiration
  async handlePlayerElimination(gameId, phoneNumber, reason = '24h_window_expired') {
    try {
      console.log(`⏰ Handling player elimination for ${phoneNumber} in game ${gameId}, reason: ${reason}`);
      
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`❌ Game ${gameId} not found in active games`);
        return;
      }

      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (!player || player.status !== 'alive') {
        console.log(`❌ Player ${phoneNumber} not found or not alive in game ${gameId}`);
        return;
      }

      // Mark player as eliminated
      player.status = 'eliminated';
      player.eliminatedAt = new Date();
      player.eliminatedOnQuestion = gameState.currentQuestion + 1;
      player.eliminationReason = reason;
      
      // Update database
      await GamePlayer.update(
        { 
          status: 'eliminated',
          eliminated_at: new Date(),
          eliminated_by_question: gameState.currentQuestion + 1
        },
        { 
          where: { 
            game_id: gameId,
            user_id: player.user.id 
          } 
        }
      );

      console.log(`❌ Player ${player.user.nickname} eliminated due to ${reason} on Q${gameState.currentQuestion + 1}`);

      // Save updated game state after elimination
      await this.setGameState(gameId, gameState);

      // Check if game should end (all players eliminated)
      const alivePlayers = gameState.players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated, ending game ${gameId}`);
        await this.endGame(gameId);
        return;
      }

      // If this was during a question, check if all remaining players have answered
      if (gameState.currentQuestion < gameState.questions.length) {
        const currentQuestion = gameState.questions[gameState.currentQuestion];
        const answeredPlayers = alivePlayers.filter(p => p.answer);
        
        if (answeredPlayers.length === alivePlayers.length) {
          console.log(`🎯 All remaining players answered, processing results immediately`);
          setTimeout(() => {
            this.sendQuestionResults(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
          }, 2000);
        }
      }

    } catch (error) {
      console.error('❌ Error handling player elimination:', error);
    }
  }

  // Process question results with Redis lock to prevent race conditions
  async processQuestionResultsWithLock(gameId, questionIndex, correctAnswer) {
    const lockKey = `result_processing:${gameId}:${questionIndex}`;
    
    try {
      console.log(`🔓 Processing question results for game ${gameId}, question ${questionIndex + 1}`);
      
      // Use Redis lock to prevent concurrent processing
      const lockAcquired = await this.acquireRedisLock(lockKey, 30);
      if (!lockAcquired) {
        console.log(`⚠️ [GAME_SERVICE] Could not acquire lock for result processing, another process is handling it`);
        return;
      }
      
      try {
        // Check if results already decided for this question
        const resultDecidedKey = `result_decided:${gameId}:${questionIndex}`;
        console.log(`🔑 [GAME_SERVICE] Checking result decided key: ${resultDecidedKey}`);
        
        const resultsAlreadyDecided = await queueService.redis?.get(resultDecidedKey);
        console.log(`🔍 [GAME_SERVICE] Results already decided: ${resultsAlreadyDecided}`);
        
        if (resultsAlreadyDecided) {
          console.log(`⚠️ [GAME_SERVICE] Results already decided for game ${gameId}, question ${questionIndex + 1}, skipping duplicate processing`);
          return;
        }
        
        // Mark results as decided with 5-minute expiration
        await queueService.redis?.setex(resultDecidedKey, 300, 'decided');
        console.log(`✅ [GAME_SERVICE] Marked results as decided for game ${gameId}, question ${questionIndex + 1}`);
        
        // Process the results
        console.log(`🚀 [GAME_SERVICE] Calling sendQuestionResults for Q${questionIndex + 1}`);
        await this.sendQuestionResults(gameId, questionIndex, correctAnswer);
        
      } finally {
        // Always release the lock
        await this.releaseRedisLock(lockKey);
      }
      
    } catch (error) {
      console.error('❌ Error in processQuestionResultsWithLock:', error);
      // Ensure lock is released even on error
      await this.releaseRedisLock(lockKey);
    }
  }

  // Send question results and handle eliminations
  async sendQuestionResults(gameId, questionIndex, correctAnswer) {
    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`❌ Game state not found for ${gameId} during results processing`);
        return;
      }

      const { players, questions } = gameState;
      
      // Check if results have already been processed for this specific question
      // Only check alive players for the current question to avoid false positives from previous questions
      const alivePlayersForCheck = players.filter(p => p.status === 'alive');
      const hasProcessedResults = alivePlayersForCheck.some(p => p.resultProcessed);
      
      if (hasProcessedResults) {
        console.log(`🔄 Question ${questionIndex + 1} results already processed for alive players, skipping duplicate processing`);
        console.log(`🔍 Alive players with resultProcessed: ${alivePlayersForCheck.filter(p => p.resultProcessed).map(p => p.user.nickname).join(', ')}`);
        return;
      }
      const question = questions[questionIndex];
      
      console.log(`📊 Processing results for Q${questionIndex + 1}: ${correctAnswer}`);

      // Process each player's answer
      for (const player of players) {
        if (player.status !== 'alive') continue;
        
        // Skip if result already processed for this player
        if (player.resultProcessed) {
          console.log(`🔄 Skipping result processing for ${player.user.nickname} - already processed`);
          continue;
        }

        // Only process players who have answers
        if (!player.answer || player.answer.trim() === '') {
          console.log(`⏳ Player ${player.user.nickname} has no answer, skipping result processing (will be handled by timeout)`);
          continue;
        }

        console.log(`🔍 Processing player ${player.user.nickname}: answer="${player.answer}", correctAnswer="${correctAnswer}"`);
        
        // Improved answer comparison with better normalization
        const normalizedPlayerAnswer = player.answer ? player.answer.toLowerCase().trim().replace(/[^\w\s]/g, '') : '';
        const normalizedCorrectAnswer = correctAnswer ? correctAnswer.toLowerCase().trim().replace(/[^\w\s]/g, '') : '';
        const isCorrect = normalizedPlayerAnswer === normalizedCorrectAnswer;
        
        console.log(`🔍 Player ${player.user.nickname} answer comparison: "${normalizedPlayerAnswer}" === "${normalizedCorrectAnswer}" = ${isCorrect}`);
        
        if (!isCorrect) {
          // Eliminate player
          player.status = 'eliminated';
          player.eliminatedAt = new Date();
          player.eliminatedOnQuestion = questionIndex + 1;
          player.eliminationReason = 'wrong_answer';
          
          // Update database
          await GamePlayer.update(
            { 
              status: 'eliminated',
              eliminated_at: new Date(),
              eliminated_by_question: questionIndex + 1
            },
            { 
              where: { 
                game_id: gameId,
                user_id: player.user.id 
              } 
            }
          );

          console.log(`❌ Player ${player.user.nickname} eliminated on Q${questionIndex + 1} (wrong answer)`);
        }

        // Mark result as processed ONLY for players who answered
        player.resultProcessed = true;

        // Send result message with consolidated deduplication
        const resultMessage = isCorrect ? 
          `✅ Correct Answer: ${correctAnswer}\n\n🎉 You're still in!` :
          `❌ Correct Answer: ${correctAnswer}\n\n💀 You're out this game. Stick around to watch the finish!`;
        
        console.log(`📤 [GAME_SERVICE] Sending result message to ${player.user.nickname}:`);
        console.log(`📤 [GAME_SERVICE] - Message: "${resultMessage}"`);
        console.log(`📤 [GAME_SERVICE] - GameId: ${gameId}`);
        console.log(`📤 [GAME_SERVICE] - QuestionIndex: ${questionIndex}`);
        console.log(`📤 [GAME_SERVICE] - MessageType: elimination`);
        
        await queueService.addMessage('send_message', {
          to: player.user.whatsapp_number,
          message: resultMessage,
          gameId: gameId,
          messageType: 'elimination',
          questionIndex: questionIndex // Add question index for better deduplication
        });
      }

      // Save updated game state after processing all players
      await this.setGameState(gameId, gameState);

      // Check if game should end (all players eliminated or last question)
      const alivePlayersAfterProcessing = players.filter(p => p.status === 'alive');
      
      if (alivePlayersAfterProcessing.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1}`);
        await this.endGame(gameId);
        return;
      }

      if (questionIndex + 1 >= questions.length) {
        console.log(`🏁 Last question completed. ${alivePlayersAfterProcessing.length} survivors!`);
        await this.endGame(gameId);
        return;
      }

      // Continue to next question
      console.log(`⏭️  Continuing to next question. ${alivePlayersAfterProcessing.length} players alive`);
      setTimeout(() => {
        console.log(`🚀 Starting next question ${questionIndex + 2} for game ${gameId}`);
        this.startQuestion(gameId, questionIndex + 1);
      }, 2000); // Reduced delay to 2 seconds for faster progression

    } catch (error) {
      console.error('❌ Error sending question results:', error);
    }
  }

  // Force end game (admin emergency function)
  async forceEndGame(gameId) {
    try {
      console.log(`🚨 FORCE ENDING GAME: ${gameId} (Admin Emergency)`);
      
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`⚠️ Game state not found for: ${gameId}, checking database...`);
        
        // If no active game state, just update database status
        const game = await Game.findByPk(gameId);
        if (game && game.status === 'in_progress') {
          await game.update({ status: 'finished' });
          console.log(`✅ Database updated: Game ${gameId} marked as finished`);
          return { 
            message: 'Game ended (no active state found)', 
            winners: [], 
            winnerCount: 0 
          };
        }
        
        throw new Error('Game not found or not in progress');
      }

      // Immediately stop all timers and clear game state
      if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
        console.log(`⏰ Emergency: Cleared question timer for game ${gameId}`);
      }
      
      if (gameState.activeTimers) {
        if (gameState.activeTimers instanceof Set) {
          gameState.activeTimers.clear();
        } else if (typeof gameState.activeTimers === 'object') {
          gameState.activeTimers = new Set();
        }
        console.log(`⏰ Emergency: Cleared all active timers for game ${gameId}`);
      }

      // Send emergency game end message to all alive players first
      const queueService = require('./queueService');
      const alivePlayers = gameState.players.filter(p => p.status === 'alive');
      
      for (const player of alivePlayers) {
        await queueService.addMessage('send_message', {
          to: player.user.whatsapp_number,
          message: `🚨 GAME ENDED BY ADMIN\n\n❌ This game has been terminated by the administrator.\n\n💰 Prize pool: $${gameState.prizePool || 100}\n🎮 Game: ${gameId.slice(0, 8)}...\n\nReply "PLAY" for the next game.`,
          gameId: gameId,
          messageType: 'emergency_end'
        });
      }

      // Mark all players as eliminated to stop any further processing
      for (const player of gameState.players) {
        if (player.status === 'alive') {
          player.status = 'eliminated';
          player.eliminatedAt = new Date();
          player.eliminatedOnQuestion = gameState.currentQuestion + 1;
          player.eliminationReason = 'admin_emergency_end';
        }
      }

      // Clear deduplication keys and cancel pending jobs
      await queueService.cancelGameJobs(gameId);
      await queueService.clearGameDeduplication(gameId);
      
      // Remove from active games and Redis
      this.activeGames.delete(gameId);
      if (this.redisGameState.isAvailable()) {
        await this.redisGameState.deleteGameState(gameId);
        console.log(`🧹 Emergency: Game state removed from Redis for: ${gameId}`);
      }
      console.log(`🧹 Emergency: Game state removed for: ${gameId}`);

      // Update database status
      const game = await Game.findByPk(gameId);
      if (game) {
        await game.update({ status: 'finished' });
            console.log(`✅ Database updated: Game ${gameId} marked as finished`);
          }

          console.log(`🚨 FORCE END COMPLETE: Game ${gameId} terminated by admin`);
          
          return { 
            message: 'Game force ended by admin', 
            winners: alivePlayers.map(p => p.user.nickname), 
            winnerCount: alivePlayers.length 
          };

    } catch (error) {
      console.error('❌ Error force ending game:', error);
      throw error;
    }
  }


  // End game
  async endGame(gameId) {
    try {
      console.log(`🏁 Ending game: ${gameId}`);
      
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.error(`❌ Game state not found for: ${gameId}`);
        return;
      }

      // Clean up timers and game state
      console.log(`🧹 Cleaning up timers and game state for: ${gameId}`);
      
      // Clear any active timers
      if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        console.log(`⏰ Cleared question timer for game ${gameId}`);
      }
      
      // Clear active timers set (handle both Set and object from Redis)
      if (gameState.activeTimers) {
        if (gameState.activeTimers instanceof Set) {
          gameState.activeTimers.clear();
        } else if (typeof gameState.activeTimers === 'object') {
          // Convert back to Set if it was serialized from Redis
          gameState.activeTimers = new Set();
        }
        console.log(`⏰ Cleared active timers set for game ${gameId}`);
      }
      
      // Clear deduplication keys and cancel pending jobs for this game
      const queueService = require('./queueService');
      await queueService.cancelGameJobs(gameId);
      await queueService.clearGameDeduplication(gameId);
      
      // Remove from Redis
      if (this.redisGameState.isAvailable()) {
        await this.redisGameState.deleteGameState(gameId);
        console.log(`🧹 Game state removed from Redis for: ${gameId}`);
      }
      
      // Remove from in-memory
      this.activeGames.delete(gameId);
      console.log(`🧹 Game state cleaned up for: ${gameId}`);

      // Process rewards using reward service
      const gameResults = await rewardService.processGameRewards(gameId);
      
      console.log(`🏆 Game ${gameId} ended successfully:`, {
        winnerCount: gameResults.winnerCount,
        status: gameResults.gameStatus,
        prizeDistribution: gameResults.prizeDistribution
      });

      return gameResults;

    } catch (error) {
      console.error('❌ Error ending game:', error);
      throw error;
    }
  }

  // Send game start message
  async sendGameStartMessage(gameId) {
    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) return;

      for (const player of gameState.players) {
        await queueService.addMessage('send_message', {
          to: player.user.whatsapp_number,
          message: `🎮 QRush Trivia is starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 30 seconds...`
        });
      }

    } catch (error) {
      console.error('❌ Error sending game start message:', error);
    }
  }

  // Get active game for a player
  async getActiveGameForPlayer(phoneNumber) {
    console.log(`🔍 Looking for active game for player: ${phoneNumber}`);
    
    // First check Redis for active games
    if (this.redisGameState.isAvailable()) {
      try {
        const activeGameIds = await this.redisGameState.getActiveGameIds();
        console.log(`🔍 Found ${activeGameIds.length} active games in Redis`);
        
        for (const gameId of activeGameIds) {
          const gameState = await this.getGameState(gameId);
          if (gameState && gameState.players) {
            console.log(`🔍 Checking Redis game ${gameId}:`);
            console.log(`🔍 - Players count: ${gameState.players.length}`);
            console.log(`🔍 - Current question: ${gameState.currentQuestion}`);
            console.log(`🔍 - Game status: ${gameState.status}`);
            
            const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
            if (player) {
              console.log(`✅ Found player in Redis game ${gameId}`);
              console.log(`🔍 [GAME_SERVICE] Player found in game ${gameId}:`);
              console.log(`🔍 [GAME_SERVICE] - Player status: ${player.status}`);
              console.log(`🔍 [GAME_SERVICE] - Game current question: ${gameState.currentQuestion}`);
              console.log(`🔍 [GAME_SERVICE] - Game status: ${gameState.status}`);
              return { gameId, gameState, player };
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking Redis for active games:', error);
      }
    }
    
    // Fallback to in-memory games
    console.log(`🔍 Active games count (in-memory): ${this.activeGames.size}`);
    
    for (const [gameId, gameState] of this.activeGames) {
      console.log(`🔍 Checking in-memory game ${gameId}:`);
      console.log(`🔍 - Players count: ${gameState.players.length}`);
      console.log(`🔍 - Current question: ${gameState.currentQuestion}`);
      console.log(`🔍 - Game status: ${gameState.status}`);
      
      const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
      if (player) {
        console.log(`✅ Found player in in-memory game ${gameId}`);
        console.log(`🔍 [GAME_SERVICE] Player found in in-memory game ${gameId}:`);
        console.log(`🔍 [GAME_SERVICE] - Player status: ${player.status}`);
        console.log(`🔍 [GAME_SERVICE] - Game current question: ${gameState.currentQuestion}`);
        console.log(`🔍 [GAME_SERVICE] - Game status: ${gameState.status}`);
        return { gameId, gameState, player };
      }
    }
    
    console.log(`❌ No active game found for player ${phoneNumber}`);
    return null;
  }




  // Note: Expired game notification logic removed - using frontend validation instead

  // Cleanup all timers (for graceful shutdown)
  cleanupAllTimers() {
    console.log('🧹 Cleaning up all game timers...');
    
    if (this.activeTimers) {
      this.activeTimers.forEach((timers, timerKey) => {
        if (timers.questionTimer) clearTimeout(timers.questionTimer);
        if (timers.countdownTimers) {
          timers.countdownTimers.forEach(timer => clearTimeout(timer));
        }
        console.log(`✅ Cleared timers for ${timerKey}`);
      });
      this.activeTimers.clear();
    }
    
    console.log('✅ All timers cleaned up');
  }

  // Redis lock helper methods
  async acquireLock(lockKey, ttl = 30) {
    if (!this.redisGameState.isAvailable()) {
      return true; // No Redis, allow operation
    }

    try {
      const result = await this.redisGameState.redis.set(lockKey, 'locked', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('❌ Error acquiring Redis lock:', error);
      return false;
    }
  }

  async releaseLock(lockKey) {
    if (!this.redisGameState.isAvailable()) {
      return true; // No Redis, allow operation
    }

    try {
      await this.redisGameState.redis.del(lockKey);
      return true;
    } catch (error) {
      console.error('❌ Error releasing Redis lock:', error);
      return false;
    }
  }

  async acquireRedisLock(lockKey, ttl = 30) {
    return this.acquireLock(lockKey, ttl);
  }

  async releaseRedisLock(lockKey) {
    return this.releaseLock(lockKey);
  }


}

module.exports = new GameService();

