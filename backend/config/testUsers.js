// Test Users Configuration
// Add your phone number here and it will be used everywhere

module.exports = {
  testUsers: [
    { whatsapp_number: '+1234567890', nickname: 'TestUser1' },
    { whatsapp_number: '+1234567891', nickname: 'TestUser2' },
    { whatsapp_number: '+1234567892', nickname: 'TestUser3' },
    { whatsapp_number: '+1234567893', nickname: 'TestUser4' },
    { whatsapp_number: '+1234567894', nickname: 'TestUser5' },
    { whatsapp_number: '+923196612416', nickname: 'Aman' },
    // ADD YOUR PHONE NUMBER HERE:
    // { whatsapp_number: '+YOUR_PHONE_NUMBER', nickname: 'YourName' }
  ],
  
  // Get just the phone numbers for easy use
  getTestPhoneNumbers() {
    return this.testUsers.map(user => user.whatsapp_number);
  }
};
