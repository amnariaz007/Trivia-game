const express = require('express');
const router = express.Router();
const Joi = require('joi');

const whatsappService = require('../services/whatsappService');
const queueService = require('../services/queueService');
const { User, Game } = require('../models');

// Webhook verification
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  
  try {
    const response = whatsappService.verifyWebhook(mode, token, challenge);
    res.status(200).send(response);
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    res.status(403).send('Forbidden');
  }
});

// Message webhook
router.post('/', async (req, res) => {
  try {
    console.log('📥 Received webhook:', JSON.stringify(req.body, null, 2));
    
    // Validate webhook structure
    const webhookSchema = Joi.object({
      object: Joi.string().valid('whatsapp_business_account').required(),
      entry: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          changes: Joi.array().items(
            Joi.object({
              value: Joi.object({
                messaging_product: Joi.string().valid('whatsapp').required(),
                metadata: Joi.object({
                  display_phone_number: Joi.string().required(),
                  phone_number_id: Joi.string().required()
                }).required(),
                contacts: Joi.array().items(
                  Joi.object({
                    profile: Joi.object({
                      name: Joi.string().required()
                    }).required(),
                    wa_id: Joi.string().required()
                  })
                ).required(),
                messages: Joi.array().items(
                  Joi.object({
                    from: Joi.string().required(),
                    id: Joi.string().required(),
                    timestamp: Joi.string().required(),
                    type: Joi.string().valid('text', 'interactive').required(),
                    text: Joi.object({
                      body: Joi.string().required()
                    }).when('type', {
                      is: 'text',
                      then: Joi.required(),
                      otherwise: Joi.forbidden()
                    }),
                    interactive: Joi.object({
                      type: Joi.string().valid('button_reply').required(),
                      button_reply: Joi.object({
                        id: Joi.string().required(),
                        title: Joi.string().required()
                      }).required()
                    }).when('type', {
                      is: 'interactive',
                      then: Joi.required(),
                      otherwise: Joi.forbidden()
                    })
                  })
                ).required()
              }).required(),
              field: Joi.string().valid('messages').required()
            })
          ).required()
        })
      ).required()
    });

    const { error } = webhookSchema.validate(req.body);
    if (error) {
      console.error('❌ Webhook validation error:', error.details);
      return res.status(400).json({ error: 'Invalid webhook structure' });
    }

    // Process each message
    for (const entry of req.body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          for (const message of value.messages) {
            await processMessage(message, value.contacts[0]);
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process individual message
async function processMessage(message, contact) {
  try {
    const phoneNumber = message.from;
    const messageText = whatsappService.extractMessageText(message);
    const buttonResponse = whatsappService.extractButtonResponse(message);

    console.log(`📱 Processing message from ${phoneNumber}: ${messageText || buttonResponse}`);

    // Get or create user
    let user = await User.findByWhatsAppNumber(phoneNumber);
    
    if (!user) {
      // New user - start registration flow
      await handleNewUser(phoneNumber, messageText || buttonResponse, contact);
      return;
    }

    // Existing user - handle their message
    await handleExistingUser(user, messageText || buttonResponse, buttonResponse);
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Handle new user registration
async function handleNewUser(phoneNumber, messageText, contact) {
  try {
    // Use WhatsApp contact name if available, otherwise use temporary nickname
    const whatsappName = contact?.profile?.name || `Player_${phoneNumber.slice(-4)}`;
    
    // Create user with WhatsApp name
    const user = await User.create({
      whatsapp_number: phoneNumber,
      nickname: whatsappName,
      registration_completed: true // Auto-complete registration with WhatsApp name
    });

    // Send welcome message
    const nextGameTime = await getNextGameTime();
    const prizePool = process.env.DEFAULT_PRIZE_POOL || 100;
    
    await queueService.addMessage('send_message', {
      to: phoneNumber,
      message: `🎉 Welcome to QRush Trivia, ${whatsappName}!

It's sudden-death: get every question right to stay in. One wrong or no answer = you're out.

💰 Today's prize pool: $${prizePool}
⏰ Next game: ${nextGameTime}

You're all set! Reply "PLAY" to join the next game or "HELP" for more info.`
    });

  } catch (error) {
    console.error('❌ Error handling new user:', error);
  }
}

// Handle existing user messages
async function handleExistingUser(user, messageText, buttonResponse) {
  try {
    // Check if user is in registration flow
    const session = await queueService.getSession(user.id);
    
    if (session && session.state === 'awaiting_nickname') {
      await handleNicknameRegistration(user, messageText);
      return;
    }

    // Handle regular game commands
    const command = (messageText || buttonResponse || '').toUpperCase().trim();
    
    switch (command) {
      case 'PLAY':
        await handlePlayCommand(user);
        break;
      case 'JOIN':
        await handleJoinCommand(user);
        break;
      case 'HELP':
        await handleHelpCommand(user);
        break;
      case 'NICKNAME':
        await handleNicknameChange(user, messageText);
        break;
      default:
        await handleGameAnswer(user, command);
        break;
    }

  } catch (error) {
    console.error('❌ Error handling existing user:', error);
  }
}

// Handle nickname registration
async function handleNicknameRegistration(user, nickname) {
  try {
    if (!nickname || nickname.length < 2 || nickname.length > 50) {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: 'Please provide a nickname between 2-50 characters.'
      });
      return;
    }

    // Update user nickname
    user.nickname = nickname;
    user.registration_completed = true;
    await user.save();

    // Clear registration session
    await queueService.deleteSession(user.id);

    // Send confirmation
    const nextGameTime = await getNextGameTime();
    const prizePool = process.env.DEFAULT_PRIZE_POOL || 100;
    
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: `✅ Welcome, ${nickname}! You're all set for QRush Trivia!

💰 Today's prize pool: $${prizePool}
⏰ Next game: ${nextGameTime}

Reply "PLAY" to get a reminder!`
    });

  } catch (error) {
    console.error('❌ Error handling nickname registration:', error);
  }
}

// Handle PLAY command
async function handlePlayCommand(user) {
  try {
    const activeGame = await Game.getActiveGame();
    
    if (!activeGame) {
      // No game scheduled
      const nextGameTime = await getNextGameTime();
      const prizePool = process.env.DEFAULT_PRIZE_POOL || 100;
      
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: `📱 There's no game running right now.

⏰ Next QRush Trivia: ${nextGameTime}
💰 Prize pool: $${prizePool}

Reply "PLAY" for a reminder.`
      });
      return;
    }

    if (activeGame.status === 'in_progress') {
      // Game in progress - can't join
      const nextGameTime = await getNextGameTime();
      
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: `🚫 The game is in progress and you can't join mid-round.

⏰ Next game: ${nextGameTime}

Reply "PLAY" to get a reminder before we start.`
      });
      return;
    }

    // Game scheduled - send reminder
    const gameTime = new Date(activeGame.start_time).toLocaleString();
    const prizePool = activeGame.prize_pool;
    
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: `🎮 QRush Trivia starts soon!

⏰ Game begins at ${gameTime}
💰 Prize pool: $${prizePool}

Tap "PLAY" to get the start ping!`
    });

  } catch (error) {
    console.error('❌ Error handling PLAY command:', error);
  }
}

// Handle JOIN command
async function handleJoinCommand(user) {
  try {
    const activeGame = await Game.getActiveGame();
    
    if (!activeGame || activeGame.status !== 'pre_game') {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: '❌ No game is currently accepting registrations. Stay tuned for the next game announcement!'
      });
      return;
    }

    // Check if user is already registered
    const existingPlayer = await GamePlayer.findOne({
      where: {
        game_id: activeGame.id,
        user_id: user.id
      }
    });

    if (existingPlayer) {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: '✅ You\'re already registered for this game! We\'ll send you a reminder when it starts.'
      });
      return;
    }

    // Register user for the game
    await GamePlayer.create({
      game_id: activeGame.id,
      user_id: user.id,
      status: 'registered'
    });

    // Send confirmation
    const gameTime = new Date(activeGame.start_time).toLocaleString();
    const prizePool = activeGame.prize_pool;
    
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: `🎉 You're registered for QRush Trivia!

⏰ Game starts at: ${gameTime}
💰 Prize pool: $${prizePool}

We'll send you a reminder 5 minutes before the game starts!`
    });

    console.log(`✅ User ${user.nickname} registered for game ${activeGame.id}`);

  } catch (error) {
    console.error('❌ Error handling JOIN command:', error);
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: '❌ Something went wrong. Please try again.'
    });
  }
}

// Handle HELP command
async function handleHelpCommand(user) {
  try {
    const nextGameTime = await getNextGameTime();
    const prizePool = process.env.DEFAULT_PRIZE_POOL || 100;
    
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: `❓ How QRush Trivia Works:

• Sudden-death: get every question right to stay in.
• 10s per question with countdown updates (10s → 5s → 2s → time's up).
• Wrong or no answer = elimination.
• If multiple players survive the final question, the prize pool is split evenly.
• Winners are DM'd directly.

📱 Commands:
• PLAY - Join next game
• HELP - Show this message
• NICKNAME [name] - Change your nickname

⏰ Next game: ${nextGameTime}
💰 Prize: $${prizePool}

Reply "PLAY" for a reminder.`
    });

  } catch (error) {
    console.error('❌ Error handling HELP command:', error);
  }
}

// Handle game answer
async function handleGameAnswer(user, answer) {
  try {
    const gameService = require('../services/gameService');
    
    // Check if user is in an active game
    const activeGame = await gameService.getActiveGameForPlayer(user.whatsapp_number);
    
    if (!activeGame) {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: '❓ I didn\'t get that. Use the answer buttons to play.'
      });
      return;
    }

    // Handle the answer
    await gameService.handlePlayerAnswer(activeGame.gameId, user.whatsapp_number, answer);

  } catch (error) {
    console.error('❌ Error handling game answer:', error);
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: '❌ Something went wrong. Please try again.'
    });
  }
}

// Handle nickname change
async function handleNicknameChange(user, newNickname) {
  try {
    if (!newNickname || newNickname.length < 2 || newNickname.length > 50) {
      await queueService.addMessage('send_message', {
        to: user.whatsapp_number,
        message: 'Please provide a nickname between 2-50 characters. Example: NICKNAME John'
      });
      return;
    }

    // Update user nickname
    user.nickname = newNickname;
    await user.save();

    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: `✅ Your nickname has been updated to: ${newNickname}`
    });

  } catch (error) {
    console.error('❌ Error handling nickname change:', error);
    await queueService.addMessage('send_message', {
      to: user.whatsapp_number,
      message: '❌ Something went wrong. Please try again.'
    });
  }
}

// Helper function to get next game time
async function getNextGameTime() {
  try {
    const scheduledGames = await Game.getScheduledGames();
    if (scheduledGames.length > 0) {
      return new Date(scheduledGames[0].start_time).toLocaleString();
    }
    return 'TBD - Stay tuned!';
  } catch (error) {
    console.error('❌ Error getting next game time:', error);
    return 'TBD - Stay tuned!';
  }
}

module.exports = router;
