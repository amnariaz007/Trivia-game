const { User } = require('../models');

async function addTestUsers() {
  try {
    console.log('🔄 Adding test users...');

    const testUsers = [
      {
        nickname: 'TestUser',
        whatsapp_number: '923196612416', // 03196612416
        is_active: true
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { whatsapp_number: userData.whatsapp_number }
      });

      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.nickname} (${userData.whatsapp_number})`);
      } else {
        console.log(`⏭️  User already exists: ${userData.nickname}`);
      }
    }

    console.log('✅ Test users added successfully!');
    
    // Show total user count
    const totalUsers = await User.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

  } catch (error) {
    console.error('❌ Error adding test users:', error);
  } finally {
    process.exit(0);
  }
}

addTestUsers();

