const { Sequelize } = require('sequelize');
console.log("Nishaani");
console.log(process.env.DATABASE_URL);



const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // for Railway or other managed DBs
    }
  }
});


// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.log("Testing error database");
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection
};
