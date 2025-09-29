const { whatsappConfig } = require('../config/whatsapp');
const { User } = require('../models');
const devConfig = require('../config/development');

class WhatsAppService {
  constructor() {
    this.client = whatsappConfig.client;
    this.phoneNumberId = whatsappConfig.phoneNumberId;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.testPhoneNumbers = devConfig.development.testPhoneNumbers || [];
  }

  // Send text message
  async sendTextMessage(to, text) {
    try {
      // Development mode safety check
      if (this.isDevelopment) {
        if (devConfig.development.disableWhatsAppMessaging) {
          console.log(`🔒 [DEV MODE] Message blocked to ${to}: ${text}`);
          return { message: 'blocked_in_development' };
        }
        
        if (devConfig.development.logMessagesOnly) {
          console.log(`📝 [DEV MODE] Would send to ${to}: ${text}`);
          return { message: 'logged_in_development' };
        }
        
        // Only allow test phone numbers in development
        if (!this.testPhoneNumbers.includes(to)) {
          console.log(`🚫 [DEV MODE] Phone number ${to} not in test list. Message blocked.`);
          return { message: 'blocked_not_test_number' };
        }
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      });
      
      console.log('✅ Text message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending text message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send template message
  async sendTemplateMessage(to, templateName, language = 'en_US') {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      });
      
      console.log('✅ Template message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending template message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send interactive message with buttons
  async sendInteractiveMessage(to, body, buttons) {
    try {
      console.log(`🎯 sendInteractiveMessage called: to=${to}, body="${body}", buttons:`, buttons);
      
      // Development mode safety check
      if (this.isDevelopment) {
        if (devConfig.development.disableWhatsAppMessaging) {
          console.log(`🔒 [DEV MODE] Interactive message blocked to ${to}: ${body}`);
          return { message: 'blocked_in_development' };
        }
        
        if (devConfig.development.logMessagesOnly) {
          console.log(`📝 [DEV MODE] Would send interactive to ${to}: ${body} with buttons:`, buttons);
          return { message: 'logged_in_development' };
        }
        
        // Only allow test phone numbers in development
        if (!this.testPhoneNumbers.includes(to)) {
          console.log(`🚫 [DEV MODE] Phone number ${to} not in test list. Interactive message blocked.`);
          return { message: 'blocked_not_test_number' };
        }
      }

      console.log(`📤 Making WhatsApp API call to ${to} with body: "${body}"`);
      
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: body },
          action: {
            buttons: buttons.map((button, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index + 1}`,
                title: button
              }
            }))
          }
        }
      });
      
      console.log('✅ Interactive message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending interactive message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send question with randomized answer buttons
  async sendQuestion(to, questionText, options, questionNumber, correctAnswer) {
    try {
      console.log(`🎯 sendQuestion called: to=${to}, questionNumber=${questionNumber}, questionText="${questionText}"`);
      console.log(`🎯 Options:`, options);
      console.log(`🎯 Correct answer:`, correctAnswer);
      
      // Ensure correct answer is always included in the 3 buttons
      const threeOptions = [correctAnswer];
      const otherOptions = options.filter(opt => opt !== correctAnswer);
      
      // Add 2 more random options from the remaining options
      for (let i = 0; i < 2 && otherOptions.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * otherOptions.length);
        threeOptions.push(otherOptions.splice(randomIndex, 1)[0]);
      }
      
      // Randomize the order of the 3 options
      const randomizedOptions = threeOptions.sort(() => Math.random() - 0.5);

      const body = `Q${questionNumber}: ${questionText}`;
      console.log(`📤 Sending interactive message to ${to}:`, body);
      console.log(`📤 Buttons:`, randomizedOptions);
      
      const result = await this.sendInteractiveMessage(to, body, randomizedOptions);
      console.log(`✅ Question sent successfully to ${to}:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error sending question:', error);
      throw error;
    }
  }

  // Send welcome message for new users
  async sendWelcomeMessage(to, prizePool, nextGameTime) {
    const message = `🎉 Welcome to QRush Trivia!

It's sudden-death: get every question right to stay in. One wrong or no answer = you're out.

💰 Today's prize pool: $${prizePool}
⏰ Next game: ${nextGameTime}

Reply "PLAY" to get a reminder when we start!`;

    return await this.sendTextMessage(to, message);
  }

  // Send game reminder
  async sendGameReminder(to, gameTime, prizePool) {
    const message = `🎮 QRush Trivia starts soon!

⏰ Game begins at ${gameTime}
💰 Prize pool: $${prizePool}

Tap "JOIN" to get the start ping!`;

    return await this.sendInteractiveMessage(to, message, ['JOIN']);
  }

  // Send question with timer - simplified to just show question
  async sendQuestionWithTimer(to, questionText, options, questionNumber, timeLeft) {
    const body = `Q${questionNumber}: ${questionText}`;
    
    return await this.sendInteractiveMessage(to, body, options);
  }

  // Send elimination message
  async sendEliminationMessage(to, correctAnswer, isCorrect) {
    let message;
    
    if (isCorrect) {
      message = `✅ Correct Answer: ${correctAnswer}\n\n🎉 You're still in!`;
    } else {
      message = `❌ Correct Answer: ${correctAnswer}\n\n💀 You're out this game. Stick around to watch the finish!`;
    }

    return await this.sendTextMessage(to, message);
  }

  // Send winner announcement
  async sendWinnerAnnouncement(to, winnerCount, prizePool, individualPrize) {
    let message;
    
    if (winnerCount === 1) {
      message = `🏆 Game over — we have a winner!\n\n💰 Prize: $${prizePool}\n\nWinner will be contacted directly for prize delivery.\n\nThanks for playing QRush Trivia!`;
    } else {
      message = `🏆 Game over!\n\nMultiple winners this time — nice!\n👥 Winners: ${winnerCount}\n💰 Prize pool: $${prizePool}\n💵 Each winner receives: $${individualPrize}\n\nWinners will be DM'd directly for payout.`;
    }

    return await this.sendTextMessage(to, message);
  }

  // Send no game running message
  async sendNoGameMessage(to, nextGameTime, prizePool) {
    const message = `📱 There's no game running right now.\n\n⏰ Next QRush Trivia: ${nextGameTime}\n💰 Prize pool: $${prizePool}\n\nReply "PLAY" for a reminder.`;

    return await this.sendInteractiveMessage(to, message, ['PLAY']);
  }

  // Send mid-game join message
  async sendMidGameMessage(to, nextGameTime) {
    const message = `🚫 The game is in progress and you can't join mid-round.\n\n⏰ Next game: ${nextGameTime}\n\nReply "PLAY" to get a reminder before we start.`;

    return await this.sendInteractiveMessage(to, message, ['PLAY']);
  }

  // Send help message
  async sendHelpMessage(to, nextGameTime, prizePool) {
    const message = `❓ How QRush Trivia Works:

• Sudden-death: get every question right to stay in.
• 10s per question with countdown updates (10s → 5s → 2s → time's up).
• Wrong or no answer = elimination.
• If multiple players survive the final question, the prize pool is split evenly.
• Winners are DM'd directly.

⏰ Next game: ${nextGameTime}
💰 Prize: $${prizePool}

Reply "PLAY" for a reminder.`;

    return await this.sendInteractiveMessage(to, message, ['PLAY']);
  }

  // Send error message
  async sendErrorMessage(to, errorType) {
    let message;
    
    switch (errorType) {
      case 'timeout':
        message = '⏰ Sorry, time is up. Wait for the next question.';
        break;
      case 'multiple_taps':
        message = '🔒 Your first answer was locked in. Please wait until the next round.';
        break;
      case 'invalid_input':
        message = '❓ Please use these commands only:\n\n🎮 PLAY - Get reminder for next game\n📝 JOIN - Join current game\n❓ HELP - Show this message';
        break;
      default:
        message = '❌ Something went wrong. Please try again.';
    }

    return await this.sendTextMessage(to, message);
  }

  // Generate timer bar visualization
  // Timer bar function removed - no more timer notifications

  // Extract phone number from WhatsApp message
  extractPhoneNumber(message) {
    return message?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id;
  }

  // Extract message text from WhatsApp webhook
  extractMessageText(message) {
    const textMessage = message?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
    const buttonMessage = message?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title;
    
    return textMessage || buttonMessage || '';
  }

  // Extract button response from WhatsApp webhook
  extractButtonResponse(message) {
    return message?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title;
  }

  // Timer update function removed - no more timer notifications in chat

  // Send game start message
  async sendGameStartMessage(to, gameInfo) {
    const message = `🎮 QRush Trivia starts now!\n\n💰 Prize pool: $${gameInfo.prizePool}\n⏰ ${gameInfo.questionTimer}s per question\n\nGet ready for sudden-death elimination!`;
    return await this.sendTextMessage(to, message);
  }

  // Send game end message
  async sendGameEndMessage(to, gameResult) {
    let message;
    if (gameResult.winnerCount === 0) {
      message = '💀 Game over - no survivors!\n\nThanks for playing QRush Trivia!';
    } else if (gameResult.winnerCount === 1) {
      message = `🏆 Game over - we have a winner!\n\nWinner will be contacted directly for prize delivery.\nThanks for playing QRush Trivia!`;
    } else {
      message = `🏆 Game over!\n\nMultiple winners this time - nice!\nWinners: ${gameResult.winnerCount}\nPrize pool: $${gameResult.prizePool}\nEach winner receives: $${gameResult.individualPrize}\n\nWinners will be DM'd directly for payout.`;
    }
    
    return await this.sendTextMessage(to, message);
  }

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
      console.log('✅ Webhook verified');
      return challenge;
    }
    throw new Error('Webhook verification failed');
  }
}

module.exports = new WhatsAppService();
