const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  whatsapp_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  registration_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['whatsapp_number']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Instance methods
User.prototype.updateActivity = function() {
  this.last_activity = new Date();
  return this.save();
};

User.prototype.completeRegistration = function() {
  this.registration_completed = true;
  return this.save();
};

// Class methods
User.findByWhatsAppNumber = function(whatsappNumber) {
  return this.findOne({
    where: { whatsapp_number: whatsappNumber }
  });
};

User.createOrUpdate = function(userData) {
  return this.findOrCreate({
    where: { whatsapp_number: userData.whatsapp_number },
    defaults: userData
  });
};

module.exports = User;
