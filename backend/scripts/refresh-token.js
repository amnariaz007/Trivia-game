const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class TokenRefresher {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.appId = process.env.WHATSAPP_APP_ID;
    this.appSecret = process.env.WHATSAPP_APP_SECRET;
    this.currentToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  // Check if current token is valid
  async checkTokenValidity() {
    try {
      console.log('🔍 Checking current token validity...');
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/me`, {
        params: {
          access_token: this.currentToken
        }
      });
      
      console.log('✅ Current token is valid');
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Current token is invalid or expired');
        return false;
      }
      console.error('❌ Error checking token:', error.message);
      return false;
    }
  }

  // Get a new access token using app credentials
  async getNewToken() {
    try {
      console.log('🔄 Getting new access token...');
      
      if (!this.appId || !this.appSecret) {
        throw new Error('WHATSAPP_APP_ID and WHATSAPP_APP_SECRET must be set in .env');
      }

      const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          grant_type: 'client_credentials'
        }
      });

      const newToken = response.data.access_token;
      console.log('✅ New token obtained');
      return newToken;
    } catch (error) {
      console.error('❌ Error getting new token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update .env file with new token
  async updateEnvFile(newToken) {
    try {
      console.log('📝 Updating .env file...');
      
      let envContent = fs.readFileSync(this.envPath, 'utf8');
      
      // Replace the existing token
      const tokenRegex = /^WHATSAPP_ACCESS_TOKEN=.*$/m;
      if (tokenRegex.test(envContent)) {
        envContent = envContent.replace(tokenRegex, `WHATSAPP_ACCESS_TOKEN=${newToken}`);
      } else {
        // Add new token if not found
        envContent += `\nWHATSAPP_ACCESS_TOKEN=${newToken}\n`;
      }
      
      fs.writeFileSync(this.envPath, envContent);
      console.log('✅ .env file updated successfully');
    } catch (error) {
      console.error('❌ Error updating .env file:', error.message);
      throw error;
    }
  }

  // Test the new token
  async testNewToken(token) {
    try {
      console.log('🧪 Testing new token...');
      
      const response = await axios.get(`https://graph.facebook.com/v18.0/me`, {
        params: {
          access_token: token
        }
      });
      
      console.log('✅ New token is valid');
      return true;
    } catch (error) {
      console.error('❌ New token test failed:', error.response?.data || error.message);
      return false;
    }
  }

  // Main refresh process
  async refreshToken() {
    try {
      console.log('🚀 Starting token refresh process...');
      
      // Check if current token is valid
      const isCurrentValid = await this.checkTokenValidity();
      
      if (isCurrentValid) {
        console.log('ℹ️  Current token is still valid. No refresh needed.');
        return;
      }
      
      // Get new token
      const newToken = await this.getNewToken();
      
      // Test new token
      const isNewValid = await this.testNewToken(newToken);
      
      if (!isNewValid) {
        throw new Error('New token is invalid');
      }
      
      // Update .env file
      await this.updateEnvFile(newToken);
      
      console.log('🎉 Token refresh completed successfully!');
      console.log('⚠️  Remember to restart your server to use the new token.');
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      process.exit(1);
    }
  }

  // Schedule automatic refresh (run every 23 hours)
  scheduleRefresh() {
    console.log('⏰ Scheduling automatic token refresh every 23 hours...');
    
    setInterval(async () => {
      console.log('🔄 Running scheduled token refresh...');
      await this.refreshToken();
    }, 23 * 60 * 60 * 1000); // 23 hours in milliseconds
  }
}

// CLI usage
async function main() {
  const refresher = new TokenRefresher();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--schedule')) {
    // Run with automatic scheduling
    await refresher.refreshToken();
    refresher.scheduleRefresh();
    
    console.log('🔄 Token refresher is running with automatic scheduling...');
    console.log('Press Ctrl+C to stop');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Token refresher stopped');
      process.exit(0);
    });
  } else {
    // Run once
    await refresher.refreshToken();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TokenRefresher;




