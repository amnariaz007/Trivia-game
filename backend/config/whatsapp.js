const axios = require('axios');

const whatsappConfig = {
  token: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v17.0',
  baseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v17.0'}`,
  
  // API endpoints
  endpoints: {
    messages: `/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    webhook: '/webhook'
  },
  
  // Message templates
  templates: {
    welcome: {
      name: 'welcome_message',
      language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '{{1}}' }, // Prize pool
            { type: 'text', text: '{{2}}' }  // Next game time
          ]
        }
      ]
    },
    gameReminder: {
      name: 'game_reminder',
      language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '{{1}}' }, // Game time
            { type: 'text', text: '{{2}}' }  // Prize pool
          ]
        }
      ]
    }
  },
  
  // HTTP client configuration
  client: axios.create({
    baseURL: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v17.0'}`,
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })
};

// Validate configuration
const validateConfig = () => {
  const required = ['ACCESS_TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN'];
  const missing = required.filter(key => !process.env[`WHATSAPP_${key}`]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing WhatsApp configuration (using test mode):', missing);
    console.log('📝 Set up WhatsApp Business Cloud API for full functionality');
    return true; // Allow app to start in test mode
  }
  
  console.log('✅ WhatsApp configuration validated');
  return true;
};

module.exports = {
  whatsappConfig,
  validateConfig
};
