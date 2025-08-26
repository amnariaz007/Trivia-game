const { whatsappConfig } = require('../config/whatsapp');
const { User } = require('../models');

class WhatsAppService {
  constructor() {
    this.client = whatsappConfig.client;
    this.phoneNumberId = whatsappConfig.phoneNumberId;
  }

  // Send text message
  async sendTextMessage(to, text) {
    try {
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

  // Send interactive message with buttons
  async sendInteractiveMessage(to, body, buttons) {
    try {
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
      
      console.log('✅ Interactive message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending interactive message:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send question with randomized answer buttons
  async sendQuestion(to, questionText, options, questionNumber) {
    try {
      // Randomize options order
      const randomizedOptions = [...options];
      for (let i = randomizedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomizedOptions[i], randomizedOptions[j]] = [randomizedOptions[j], randomizedOptions[i]];
      }

      const body = `Q${questionNumber}: ${questionText}`;
      const buttons = randomizedOptions;

      return await this.sendInteractiveMessage(to, body, buttons);
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

Tap "PLAY" to get the start ping!`;

    return await this.sendInteractiveMessage(to, message, ['PLAY']);
  }

  // Send question with timer
  async sendQuestionWithTimer(to, questionText, options, questionNumber, timeLeft) {
    const timerBar = this.generateTimerBar(timeLeft);
    const body = `Q${questionNumber}: ${questionText}\n\n⏱️ Time left: ${timerBar} ${timeLeft}s`;
    
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
        message = '❓ I didn\'t get that. Use the answer buttons to play.';
        break;
      default:
        message = '❌ Something went wrong. Please try again.';
    }

    return await this.sendTextMessage(to, message);
  }

  // Generate timer bar visualization
  generateTimerBar(seconds) {
    const totalBlocks = 10;
    const filledBlocks = Math.ceil((seconds / 10) * totalBlocks);
    return '■'.repeat(filledBlocks) + '□'.repeat(totalBlocks - filledBlocks);
  }

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
