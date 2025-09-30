const { Game, User, Question, GamePlayer, PlayerAnswer } = require('../models');
const queueService = require('./queueService');
const rewardService = require('./rewardService');
const whatsappService = require('./whatsappService');
const CircuitBreaker = require('./circuitBreaker');
const RedisGameState = require('./redisGameState');

class GameService {
  constructor() {
    this.activeGames = new Map(); // In-memory game state (fallback)
    this.redisGameState = new RedisGameState(); // Redis game state (primary)
    this.circuitBreaker = new CircuitBreaker();
    this.inMemoryLocks = new Set(); // Fallback dedupe when Redis not available
    this.cleanupInterval = null; // For periodic cleanup
    
    // Start periodic cleanup to prevent memory leaks
    this.startCleanup();
    
    console.log('✅ Circuit Breaker initialized for GameService');
    console.log('✅ Redis Game State initialized for GameService');
  }

  // Periodic cleanup to prevent memory leaks
  startCleanup() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredGames();
    }, 5 * 60 * 1000);
  }

  // Clean up expired games and old locks
  cleanupExpiredGames() {
    try {
      const now = Date.now();
      const maxGameAge = 2 * 60 * 60 * 1000; // 2 hours
      const maxLockAge = 5 * 60 * 1000; // 5 minutes
      
      // Clean up old in-memory games
      for (const [gameId, gameState] of this.activeGames.entries()) {
        if (gameState.lastActivity && (now - gameState.lastActivity) > maxGameAge) {
          console.log(`🧹 Cleaning up expired game: ${gameId}`);
          this.cleanupGameState(gameId);
          this.activeGames.delete(gameId);
        }
      }
      
      // Clean up old in-memory locks (fallback when Redis unavailable)
      const lockKeys = Array.from(this.inMemoryLocks);
      for (const lockKey of lockKeys) {
        // Simple cleanup - remove locks older than 5 minutes
        // This is a basic implementation; in production you'd want more sophisticated cleanup
        if (lockKey.includes('results:') && Math.random() < 0.1) { // 10% chance to clean
          this.inMemoryLocks.delete(lockKey);
        }
      }
      
      console.log(`🧹 Cleanup completed: ${this.activeGames.size} active games, ${this.inMemoryLocks.size} locks`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Clean up game state when game ends
  async cleanupGameState(gameId) {
    try {
      const gameState = this.activeGames.get(gameId);
      if (gameState) {
        // Clear all timers
        if (gameState.questionTimer) {
          clearTimeout(gameState.questionTimer);
        }
        if (gameState.countdownTimers) {
          gameState.countdownTimers.forEach(timer => clearTimeout(timer));
        }
        
        // Cancel any pending countdown jobs
        await this.cancelCountdownJobs(gameId, gameState.currentQuestion || 0);
        
        // Cancel all pending queue jobs for this game
        await this.cancelAllGameJobs(gameId);
        
        console.log(`🧹 Cleaned up game state for: ${gameId}`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up game state:', error);
    }
  }

  // Cancel all pending queue jobs for a game
  async cancelAllGameJobs(gameId) {
    try {
      const queueService = require('./queueService');
      
      // Cancel message queue jobs for this game
      if (queueService.messageQueue) {
        const waitingMessages = await queueService.messageQueue.getWaiting();
        const gameMessages = waitingMessages.filter(job => 
          job.data.gameId === gameId
        );
        
        for (const job of gameMessages) {
          await job.remove();
          console.log(`🗑️ Cancelled message job: ${job.name} for game ${gameId}`);
        }
      }
      
      // Cancel game queue jobs for this game
      if (queueService.gameQueue) {
        const waitingGames = await queueService.gameQueue.getWaiting();
        const gameJobs = waitingGames.filter(job => 
          job.data.gameId === gameId
        );
        
        for (const job of gameJobs) {
          await job.remove();
          console.log(`🗑️ Cancelled game job: ${job.name} for game ${gameId}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error cancelling game jobs:', error);
    }
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

  // Start a new game
  async startGame(gameId) {
    try {
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

      // Start first question after 2 seconds
      setTimeout(() => {
        console.log(`🚀 Starting first question for game ${gameId} after 2 second delay`);
        this.startQuestion(gameId, 0);
      }, 2000);

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
      gameState.questionStartTime = new Date();
      
      // Reset player answer states for new question
      for (const player of players) {
        if (player.status === 'alive') {
          player.answer = null;
          player.answerTime = null;
        }
      }

      // Save updated game state to Redis once (optimized)
      await this.setGameState(gameId, gameState);

      // Update game in database with null check
      const game = await Game.findByPk(gameId);
      if (!game) {
        console.error(`❌ Game not found in database: ${gameId}`);
        throw new Error(`Game ${gameId} not found in database`);
      }
      
      game.current_question = questionIndex;
      await game.save();

      // Enqueue question for all alive players (non-blocking, scalable)
      console.log(`📤 Enqueuing question ${questionIndex + 1} to ${players.filter(p => p.status === 'alive').length} alive players`);
      const enqueuePromises = [];
      for (const player of players) {
        if (player.status === 'alive') {
          enqueuePromises.push(
            queueService.addMessage('send_question', {
              to: player.user.whatsapp_number,
              gameId,
              questionNumber: questionIndex + 1,
              questionText: question.question_text,
              options: [question.option_a, question.option_b, question.option_c, question.option_d],
              correctAnswer: question.correct_answer,
              timeLimit: 10
            }).catch(err => {
              console.error(`❌ Failed to enqueue question for ${player.user.nickname}:`, err?.message || err);
              return null;
            })
          );
        }
      }
      // Do not await long; settle quickly to avoid blocking request lifecycle
      Promise.allSettled(enqueuePromises).then(() => {
        console.log(`✅ Question ${questionIndex + 1} enqueue complete`);
      });

      // Start countdown timer
      await this.startQuestionTimer(gameId, questionIndex, 10);

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

  // Start question timer via Bull delayed job so it survives restarts
  async startQuestionTimer(gameId, questionIndex, totalSeconds) {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    // Clear any existing in-process timer reference
    if (gameState.questionTimer) {
      console.log(`🔄 Clearing existing in-process timer for question ${questionIndex + 1}`);
      clearInterval(gameState.questionTimer);
      gameState.questionTimer = null;
    }

    console.log(`⏰ Scheduling timer for question ${questionIndex + 1} (${totalSeconds}s) via queue`);
    
    // ALWAYS use in-process timers for countdowns to ensure reliability
    // Queue-based timers are unreliable for short delays
    const alivePlayers = gameState.players.filter(p => p.status === 'alive');
    if (alivePlayers.length > 0) {
      console.log(`⏳ Setting up in-process countdown timers for ${alivePlayers.length} players`);
      
      // Schedule 5s countdown
      if (totalSeconds > 5) {
        const countdown5Timer = setTimeout(() => {
          console.log(`⏳ [TIMER] 5s countdown firing for question ${questionIndex + 1}`);
          this.sendCountdown(gameId, questionIndex, 5);
        }, (totalSeconds - 5) * 1000);
        
        // Store timer reference for cleanup
        if (!gameState.countdownTimers) gameState.countdownTimers = [];
        gameState.countdownTimers.push(countdown5Timer);
      }
      
      // Schedule 2s countdown
      if (totalSeconds > 2) {
        const countdown2Timer = setTimeout(() => {
          console.log(`⏳ [TIMER] 2s countdown firing for question ${questionIndex + 1}`);
          this.sendCountdown(gameId, questionIndex, 2);
        }, (totalSeconds - 2) * 1000);
        
        // Store timer reference for cleanup
        if (!gameState.countdownTimers) gameState.countdownTimers = [];
        gameState.countdownTimers.push(countdown2Timer);
      }
    }

    try {
      await queueService.addGameTimer('question_timer', { gameId, questionIndex }, totalSeconds);
    } catch (e) {
      console.error('❌ Failed to schedule question timer, falling back to setTimeout:', e?.message || e);
      // Fallback: in-process timer if queue unavailable
      const timer = setTimeout(async () => {
        console.log(`⏰ [fallback] Question ${questionIndex + 1} time expired - processing timeout`);
        await this.handleQuestionTimeout(gameId, questionIndex);
      }, totalSeconds * 1000);
      gameState.questionTimer = timer;
    }
  }

  // Cancel pending countdown jobs for a question
  async cancelCountdownJobs(gameId, questionIndex) {
    try {
      // Clear in-process countdown timers
      const gameState = await this.getGameState(gameId);
      if (gameState && gameState.countdownTimers) {
        console.log(`🗑️ Clearing ${gameState.countdownTimers.length} countdown timers for question ${questionIndex + 1}`);
        gameState.countdownTimers.forEach(timer => clearTimeout(timer));
        gameState.countdownTimers = [];
      }

      // Also clear the main question timer if it exists
      if (gameState && gameState.questionTimer) {
        clearTimeout(gameState.questionTimer);
        gameState.questionTimer = null;
      }

      // Also cancel queue-based countdown jobs if available
      const queueService = require('./queueService');
      if (!queueService.gameQueue) return;

      // Get all waiting jobs and remove countdown jobs for this question
      const waitingJobs = await queueService.gameQueue.getWaiting();
      const countdownJobs = waitingJobs.filter(job => 
        job.name === 'question_countdown' && 
        job.data.gameId === gameId && 
        job.data.questionIndex === questionIndex
      );

      for (const job of countdownJobs) {
        await job.remove();
        console.log(`🗑️ Cancelled countdown job: ${job.data.secondsLeft}s for question ${questionIndex + 1}`);
      }
    } catch (error) {
      console.error('❌ Error cancelling countdown jobs:', error);
    }
  }

  // Send countdown messages to alive players (deduped by queueService)
  async sendCountdown(gameId, questionIndex, secondsLeft, metadata = {}) {
    try {
      const gameState = await this.getGameState(gameId);
      if (!gameState) {
        console.log(`⚠️ No game state found for countdown: gameId=${gameId}, question=${questionIndex + 1}, secondsLeft=${secondsLeft}`);
        return;
      }

      // If question already advanced, skip
      if (gameState.currentQuestion !== questionIndex) {
        console.log(`⚠️ Question advanced, skipping countdown: current=${gameState.currentQuestion}, expected=${questionIndex}, secondsLeft=${secondsLeft}`);
        return;
      }

      // Check if game is still active (support legacy 'active' and current 'in_progress')
      const isGameActive = gameState.status === 'active' || gameState.status === 'in_progress';
      if (!isGameActive) {
        console.log(`⚠️ Game not active, skipping countdown: status=${gameState.status}, secondsLeft=${secondsLeft}`);
        return;
      }

      // Send only to players who are alive AND have not answered yet
      const alivePlayers = gameState.players.filter(p => p.status === 'alive' && (!p.answer || p.answer.trim() === ''));
      if (alivePlayers.length === 0) {
        console.log(`⚠️ No alive players for countdown: secondsLeft=${secondsLeft}`);
        return;
      }

      const message = secondsLeft === 2 ? '⏳ 2s left!' : '⏳ 5s left!';
      const messageType = `countdown_${secondsLeft}`;

      console.log(`⏳ Sending ${secondsLeft}s countdown to ${alivePlayers.length} alive players (gameId=${gameId}, question=${questionIndex + 1})`);

      for (const player of alivePlayers) {
        await queueService.addMessage('send_message', {
          to: player.user.whatsapp_number,
          message,
          gameId,
          messageType
        });
      }
    } catch (error) {
      console.error('❌ Error sending countdown:', error);
    }
  }


    // Handle player answer
  async handlePlayerAnswer(gameId, phoneNumber, answer) {
    let lockKey = null; // Declare lockKey outside try block
    try {
      console.log(`🎯 handlePlayerAnswer called: gameId=${gameId}, phone=${phoneNumber}, answer="${answer}"`);
      
      // Use Redis lock to prevent race conditions when multiple players answer simultaneously
      // Shorter lock timeout to reduce contention
      lockKey = `game_lock:${gameId}:answer:${phoneNumber}`;
      const lockAcquired = await this.acquireLock(lockKey, 3); // 3 second lock (reduced from 10)
      
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

      // Check if the question is still active. Accept a slightly larger grace window to avoid false late flags
      const questionStartTime = gameState.questionStartTime instanceof Date ? gameState.questionStartTime : new Date(gameState.questionStartTime);
      const timeSinceQuestionStart = Date.now() - questionStartTime.getTime();
      const questionDurationMs = (gameState.questionDurationSeconds ? gameState.questionDurationSeconds : 10) * 1000;
      const graceMs = parseInt(process.env.ANSWER_GRACE_MS || '3000', 10); // default 3s grace
      const maxAnswerTime = questionDurationMs + graceMs;
      
      if (timeSinceQuestionStart > maxAnswerTime) {
        console.log(`⏰ Answer too late for ${phoneNumber} - ${timeSinceQuestionStart}ms since question start`);
        
        // Eliminate the player immediately for the current question, if still alive
        try {
          const questionNumber = (gameState.currentQuestion || 0) + 1;
          const player = gameState.players.find(p => p.user.whatsapp_number === phoneNumber);
          if (player && player.status === 'alive') {
            player.status = 'eliminated';
            player.eliminatedAt = new Date();
            player.eliminatedOnQuestion = questionNumber;
            player.eliminationReason = 'no_answer';
            await this.setGameState(gameId, gameState);

            // Persist to DB best-effort
            try {
              await GamePlayer.update(
                { status: 'eliminated', eliminated_at: new Date(), eliminated_by_question: questionNumber },
                { where: { game_id: gameId, user_id: player.user.id } }
              );
            } catch (dbErr) {
              console.error('⚠️ DB update failed for late elimination:', dbErr.message);
            }

            // Notify user (deduped per game/question)
            const lateKey = `answer_too_late:${gameId}:${gameState.currentQuestion}:${phoneNumber}`;
            const alreadyNotified = this.redisGameState.isAvailable() ?
              await this.redisGameState.redis.get(lateKey) : null;
            if (!alreadyNotified) {
              const gameSnippet = String(gameId).slice(0, 8) + '...';
              const message = `⏰ Time's up! You didn't answer in time and have been eliminated.\n\n❌ Eliminated on: Question ${questionNumber}\n🎮 Game: ${gameSnippet}\n\nStick around to watch the finish! Reply "PLAY" for the next game.`;
              await queueService.addMessage('send_message', {
                to: phoneNumber,
                message,
                gameId,
                messageType: 'elimination'
              });
              if (this.redisGameState.isAvailable()) {
                await this.redisGameState.redis.setex(lateKey, 300, 'sent');
              }
            }
          }
        } catch (notifyErr) {
          console.error('❌ Failed to process late-answer elimination:', notifyErr);
        }
        await this.releaseLock(lockKey);
        return { message: 'answer_too_late' };
      }
      
      console.log(`✅ Answer from ${phoneNumber} is within time window: ${timeSinceQuestionStart}ms since question start`);

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

        // Double-check if player already answered (with lock)
        if (player.answer) {
          console.log(`❌ Player already answered: ${player.answer}`);
          
          // Check if all players have answered and process results if needed
          const alivePlayers = gameState.players.filter(p => p.status === 'alive');
          const answeredPlayers = alivePlayers.filter(p => p.answer);
          
          if (answeredPlayers.length === alivePlayers.length && alivePlayers.length > 0) {
            console.log(`🎯 All players answered, clearing timer and processing results for already answered player`);
            
            // Clear the timer since all players have answered
            if (gameState.questionTimer) {
              clearInterval(gameState.questionTimer);
              gameState.questionTimer = null;
              console.log(`⏰ Cleared timer - all players answered (already answered case)`);
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
        console.log(`✅ Player ${player.user.nickname} answer confirmed: "${player.answer}"`);
        console.log(`🔍 Answer processing for ${player.user.nickname} - time since question start: ${Date.now() - questionStartTime.getTime()}ms`);
        
        const isCorrect = answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
      
        console.log(`🔍 Answer comparison:`);
        console.log(`🔍 Player answer: "${answer}"`);
        console.log(`🔍 Correct answer: "${currentQuestion.correct_answer}"`);
        console.log(`🔍 Is correct: ${isCorrect}`);

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
        
        // Check if all alive players have answered
        if (answeredPlayers.length === alivePlayers.length && alivePlayers.length > 0) {
          console.log(`🎯 All remaining players answered, clearing timer and processing results immediately`);
          
          // Clear the timer since all players have answered
          if (gameState.questionTimer) {
            clearInterval(gameState.questionTimer);
            gameState.questionTimer = null;
            console.log(`⏰ Cleared timer - all players answered`);
          }
          
          // All players answered, process results immediately
          setTimeout(async () => {
            console.log(`🚀 Processing question results for Q${gameState.currentQuestion + 1}`);
            await this.processQuestionResultsWithLock(gameId, gameState.currentQuestion, currentQuestion.correct_answer);
          }, 1000); // Reduced delay to 1 second for faster progression
        } else {
          console.log(`⏳ ${alivePlayers.length - answeredPlayers.length} players still need to answer, waiting...`);
          // Not all players answered yet, continue waiting
        }

        return {
          correct: answer === gameState.questions[gameState.currentQuestion].correct_answer,
          correctAnswer: gameState.questions[gameState.currentQuestion].correct_answer
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

      // Cancel any pending countdown jobs for this question
      await this.cancelCountdownJobs(gameId, questionIndex);

      const { players, questions } = gameState;
      const question = questions[questionIndex];
      
      console.log(`⏰ Question ${questionIndex + 1} timeout - processing eliminations`);

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

Stick around to watch the finish! Reply "PLAY" for the next game.`
          });
        }
      }

      // Check if game should end
      const alivePlayers = players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1} (timeout)`);
        await this.endGame(gameId);
        return;
      }

      // Process question results and continue
      await this.sendQuestionResults(gameId, questionIndex, question.correct_answer);

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
    try {
      console.log(`🔓 Processing question results for game ${gameId}, question ${questionIndex + 1}`);

      // Cancel any pending countdown jobs for this question
      await this.cancelCountdownJobs(gameId, questionIndex);

      // Single result authority: use Redis to ensure only one path processes results
      const resultKey = `result_decided:${gameId}:${questionIndex}`;
      const lockAcquired = await this.acquireLock(resultKey, 30); // 30 second lock
      
      if (!lockAcquired) {
        console.log(`🔒 Results already being processed for game ${gameId}, question ${questionIndex + 1}`);
        return;
      }

      try {
        // Double-check: verify this question hasn't been processed yet
        const gameState = await this.getGameState(gameId);
        if (!gameState || gameState.currentQuestion > questionIndex) {
          console.log(`⚠️ Question ${questionIndex + 1} already advanced, skipping results`);
          return;
        }

        // Mark result as decided in Redis with TTL
        if (this.redisGameState.isAvailable()) {
          await this.redisGameState.redis.setex(resultKey, 300, 'decided'); // 5 minute TTL
        }

        await this.sendQuestionResults(gameId, questionIndex, correctAnswer);
        console.log(`✅ Results processed for game ${gameId}, question ${questionIndex + 1}`);
        
      } finally {
        await this.releaseLock(resultKey);
      }
      
    } catch (error) {
      console.error('❌ Error in processQuestionResultsWithLock:', error);
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
      const question = questions[questionIndex];
      
      console.log(`📊 Processing results for Q${questionIndex + 1}: ${correctAnswer}`);

      // Process each player's answer
      for (const player of players) {
        if (player.status !== 'alive') continue;

        console.log(`🔍 Processing player ${player.user.nickname}: answer="${player.answer}", correctAnswer="${correctAnswer}"`);
        const isCorrect = player.answer && player.answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        console.log(`🔍 Player ${player.user.nickname} isCorrect: ${isCorrect}`);
        
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

        // Send result message with enhanced deduplication and state validation
        const resultDedupeKey = `result_sent:${gameId}:${questionIndex}:${player.user.whatsapp_number}`;
        const resultAlreadySent = this.redisGameState.isAvailable() ? 
          await this.redisGameState.redis.get(resultDedupeKey) : null;
        
        if (!resultAlreadySent) {
          // Re-validate player state before sending
          const currentState = await this.getGameState(gameId);
          const currentPlayer = currentState?.players?.find(p => p.user.whatsapp_number === player.user.whatsapp_number);
          
          if (currentPlayer && currentPlayer.status === player.status) {
            await queueService.addMessage('send_message', {
              to: player.user.whatsapp_number,
              message: isCorrect ? 
                `✅ Correct Answer: ${correctAnswer}\n\n🎉 You're still in!` :
                `❌ Correct Answer: ${correctAnswer}\n\n💀 You're out this game. Stick around to watch the finish!`,
              gameId: gameId,
              messageType: isCorrect ? 'correct_answer' : 'elimination'
            });
            
            // Mark as sent to prevent duplicates
            if (this.redisGameState.isAvailable()) {
              await this.redisGameState.redis.setex(resultDedupeKey, 300, 'sent');
            }
            console.log(`📤 Result message sent to ${player.user.nickname} (${isCorrect ? 'correct' : 'eliminated'})`);
          } else {
            console.log(`⚠️ Player ${player.user.nickname} state changed, skipping result message`);
          }
        } else {
          console.log(`🔄 Skipping duplicate result message for ${player.user.nickname}`);
        }
      }

      // Save updated game state after processing all players
      await this.setGameState(gameId, gameState);

      // Check if game should end (all players eliminated or last question)
      const alivePlayers = players.filter(p => p.status === 'alive');
      
      if (alivePlayers.length === 0) {
        console.log(`💀 All players eliminated on Q${questionIndex + 1}`);
        await this.endGame(gameId);
        return;
      }

      if (questionIndex + 1 >= questions.length) {
        console.log(`🏁 Last question completed. ${alivePlayers.length} survivors!`);
        await this.endGame(gameId);
        return;
      }

      // Continue to next question
      console.log(`⏭️  Continuing to next question. ${alivePlayers.length} players alive`);
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

      // Clear deduplication keys
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
      
      // Use the comprehensive cleanup method
      await this.cleanupGameState(gameId);
      
      // Clear deduplication keys for this game
      const queueService = require('./queueService');
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
          message: `🎮 QRush Trivia is starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 5 seconds...`
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
        return { gameId, gameState, player };
      }
    }
    
    console.log(`❌ No active game found for player ${phoneNumber}`);
    return null;
  }

  // Check if player is in active game
  async isPlayerInActiveGame(phoneNumber) {
    const activeGame = await this.getActiveGameForPlayer(phoneNumber);
    return activeGame !== null;
  }

  // Get player status in active game
  async getPlayerGameStatus(phoneNumber) {
    const activeGame = await this.getActiveGameForPlayer(phoneNumber);
    if (!activeGame) return null;
    
    return {
      gameId: activeGame.gameId,
      status: activeGame.player.status,
      currentQuestion: activeGame.gameState.currentQuestion + 1,
      totalQuestions: activeGame.gameState.questions.length
    };
  }

  // Get game statistics
  async getGameStats(gameId) {
    try {
      const game = await Game.findByPk(gameId, {
        include: [
          { model: GamePlayer, as: 'players' },
          { model: PlayerAnswer, as: 'answers' }
        ]
      });

      if (!game) return null;

      return {
        totalPlayers: game.players.length,
        winnerCount: game.winner_count,
        prizePool: game.prize_pool,
        startTime: game.start_time,
        endTime: game.end_time,
        duration: game.end_time ? (game.end_time - game.start_time) / 1000 : null
      };

    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      return null;
    }
  }

  // Note: Expired game notification logic removed - using frontend validation instead

  // Cleanup all timers (for graceful shutdown)
  cleanupAllTimers() {
    console.log('🧹 Cleaning up all game timers...');
    
    for (const [gameId, gameState] of this.activeGames) {
      if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        console.log(`⏰ Cleared timer for game ${gameId}`);
      }
      
      if (gameState.activeTimers) {
        if (gameState.activeTimers instanceof Set) {
          gameState.activeTimers.clear();
        } else if (typeof gameState.activeTimers === 'object') {
          gameState.activeTimers = new Set();
        }
        console.log(`⏰ Cleared active timers for game ${gameId}`);
      }
    }
    
    console.log('✅ All timers cleaned up');
  }

  /**
   * Acquire a Redis lock to prevent race conditions
   * @param {string} lockKey - Lock key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Whether lock was acquired
   */
  async acquireLock(lockKey, ttl = 30) {
    if (!this.redisGameState.isAvailable()) {
      return true; // No Redis, allow operation
    }

    try {
      const result = await this.redisGameState.redis.set(lockKey, 'locked', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('❌ Error acquiring lock:', error);
      return false;
    }
  }

  /**
   * Release a Redis lock
   * @param {string} lockKey - Lock key
   * @returns {Promise<boolean>} Whether lock was released
   */
  async releaseLock(lockKey) {
    if (!this.redisGameState.isAvailable()) {
      return true; // No Redis, allow operation
    }

    try {
      await this.redisGameState.redis.del(lockKey);
      return true;
    } catch (error) {
      console.error('❌ Error releasing lock:', error);
      return false;
    }
  }
}

module.exports = new GameService();

