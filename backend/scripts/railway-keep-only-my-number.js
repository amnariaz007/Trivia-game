
// Railway Production Script - Keep Only My Number
// Run this on Railway backend: node scripts/railway-keep-only-my-number.js

const { User } = require('./models');

async function keepOnlyMyNumber() {
  try {
    console.log('🔍 Starting user cleanup on Railway...');
    
    const totalUsers = await User.count();
    console.log(`📊 Current total users: ${totalUsers}`);
    
    const myUser = await User.findOne({
      where: { whatsapp_number: '+923196612416' }
    });
    
    if (!myUser) {
      console.log('❌ Your number not found');
      return;
    }
    
    console.log(`✅ Found your user: ${myUser.nickname}`);
    
    const deletedCount = await User.destroy({
      where: { whatsapp_number: { [require('sequelize').Op.ne]: '+923196612416' } }
    });
    
    console.log(`✅ Deleted ${deletedCount} users, kept your number`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

keepOnlyMyNumber();
