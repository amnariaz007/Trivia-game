const { Sequelize } = require('sequelize');

// Smart database configuration that works for both local and production
const isLocalDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false, // Disable SQL query logging
  define: {
    underscored: false, // Use camelCase to match database
    timestamps: true
  },
      // Connection pool configuration for 1000+ users
      pool: {
        max: 100,       // Maximum 100 connections in pool (increased for 1000 users)
        min: 20,        // Always keep 20 connections ready
        acquire: 60000, // Wait max 60 seconds to get a connection
        idle: 30000,    // Close idle connections after 30 seconds
        evict: 5000,    // Check for idle connections every 5 seconds
        handleDisconnects: true // Automatically reconnect on connection loss
      },
  dialectOptions: isLocalDatabase ? {} : {
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
    console.log('🔗 Connection pool configured for 1000+ users:');
    console.log('   - Max connections: 100');
    console.log('   - Min connections: 20');
    console.log('   - Acquire timeout: 60s');
    console.log('   - Idle timeout: 30s');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection
};
