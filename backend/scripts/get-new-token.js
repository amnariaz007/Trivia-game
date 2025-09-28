const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function updateTokenInEnv(newToken) {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the existing token
    const tokenRegex = /^WHATSAPP_ACCESS_TOKEN=.*$/m;
    if (tokenRegex.test(envContent)) {
      envContent = envContent.replace(tokenRegex, `WHATSAPP_ACCESS_TOKEN=${newToken}`);
    } else {
      // Add new token if not found
      envContent += `\nWHATSAPP_ACCESS_TOKEN=${newToken}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
}

async function getNewToken() {
  console.log('🔑 WhatsApp Token Updater');
  console.log('========================');
  console.log('');
  console.log('📋 Steps to get a new token:');
  console.log('1. Go to: https://developers.facebook.com/apps/');
  console.log('2. Select your WhatsApp Business App');
  console.log('3. Go to WhatsApp > API Setup');
  console.log('4. Click "Generate access token"');
  console.log('5. Copy the entire token');
  console.log('');
  
  rl.question('📝 Paste your new token here: ', (newToken) => {
    if (!newToken || newToken.trim().length < 100) {
      console.log('❌ Invalid token. Token should be very long (200+ characters).');
      rl.close();
      return;
    }
    
    const trimmedToken = newToken.trim();
    console.log(`📏 Token length: ${trimmedToken.length} characters`);
    
    if (updateTokenInEnv(trimmedToken)) {
      console.log('');
      console.log('🎉 Token updated successfully!');
      console.log('');
      console.log('⚠️  IMPORTANT: Restart your server to use the new token:');
      console.log('   pkill -f "node app.js" && node app.js');
      console.log('');
      console.log('🧪 Test the token with: node scripts/check-token-status.js');
    }
    
    rl.close();
  });
}

getNewToken();



