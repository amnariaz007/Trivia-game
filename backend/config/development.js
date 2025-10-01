// Development Configuration
// This file contains settings for local development to avoid conflicts with production

const testUsersConfig = require('./testUsers');

module.exports = {
  // Use local database to avoid production conflicts
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qrush_trivia_local',
    options: {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      define: {
        underscored: true,
        timestamps: true
      },
      dialectOptions: {
        // No SSL for local development
      }
    }
  },

  // Use local Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // WhatsApp API settings (WARNING: Same as production!)
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v17.0'
  },

  // Development-specific settings
  development: {
    // Disable WhatsApp messaging in development
    disableWhatsAppMessaging: false,
    
    // Use test phone numbers only (from central config)
    testPhoneNumbers: testUsersConfig.getTestPhoneNumbers(),
    
    // Log all messages instead of sending
    logMessagesOnly: false,
    
    // Frontend URL for development
    frontendUrl: 'http://localhost:3001'
  }
};
