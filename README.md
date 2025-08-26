# 🎮 QRush Trivia - Sudden-Death WhatsApp Game

A real-time trivia game built for WhatsApp Business Cloud API with sudden-death elimination mechanics.

## 🚀 Features

- **Sudden-Death Gameplay**: Players must answer every question correctly to stay in
- **Real-Time Messaging**: WhatsApp integration with instant notifications
- **Automated Reminders**: 30-minute and 5-minute game reminders
- **Prize Splitting**: Automatic prize distribution for multiple winners
- **Admin Dashboard**: Web interface for game management
- **Redis Queue**: High-volume message handling
- **PostgreSQL Database**: Reliable data storage

## 📋 Milestone 1 - Setup & Foundations ✅

### Deliverables Completed:
1. ✅ WhatsApp Business Cloud API with webhook integration
2. ✅ Redis queue for high-volume message handling
3. ✅ Database structure (users, nicknames, responses, results)
4. ✅ One-time signup flow (nickname + WhatsApp number as ID)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ 
- PostgreSQL database
- Redis server
- WhatsApp Business Cloud API account

### 1. Environment Setup

Copy the environment file and configure your settings:

```bash
cp env.example .env
```

Update `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qrush_trivia
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/qrush_trivia

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# WhatsApp Business Cloud API
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_API_VERSION=v17.0

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password

# Game Configuration
DEFAULT_PRIZE_POOL=100
QUESTION_TIMER=10
MAX_PLAYERS=100
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Initialize database tables
npm run init-db

# Set up test data
node scripts/test-setup.js
```

### 4. Start Services

```bash
# Start Redis (if not running)
redis-server

# Start the application
npm start
```

## 🧪 Testing the System

### 1. Access Admin Dashboard

Open your browser and go to: `http://localhost:3000/admin.html`

Use the credentials from your `.env` file:
- Username: `admin`
- Password: `your_admin_password`

### 2. Test Game Flow

#### Step 1: Create a Game
1. Go to the admin dashboard
2. Fill in the "Create New Game" form:
   - Start Time: Set to 30 minutes from now
   - Prize Pool: $100
   - Number of Questions: 5
3. Click "Create Game"

#### Step 2: Add Questions
1. Copy the Game ID from the created game
2. In the "Add Questions" section, paste the Game ID
3. Add questions in JSON format:

```json
[
  {
    "question_text": "What is the capital of France?",
    "option_a": "London",
    "option_b": "Paris",
    "option_c": "Berlin",
    "option_d": "Madrid",
    "correct_answer": "Paris"
  },
  {
    "question_text": "Which planet is known as the Red Planet?",
    "option_a": "Venus",
    "option_b": "Mars",
    "option_c": "Jupiter",
    "option_d": "Saturn",
    "correct_answer": "Mars"
  }
]
```

#### Step 3: Start Registration
1. Find your game in the "Manage Games" section
2. Click "Start Registration"
3. This will send announcements to all registered users

#### Step 4: Test WhatsApp Integration
1. Send a message to your WhatsApp number: "JOIN"
2. You should receive a confirmation message
3. Wait for the 30-minute and 5-minute reminders
4. When the game starts, you'll receive questions with answer buttons

### 3. Test User Registration

#### New User Flow:
1. Send any message to your WhatsApp number
2. You'll receive a welcome message asking for your nickname
3. Reply with your preferred nickname
4. You'll be registered and can use "JOIN" to register for games

#### Existing User Commands:
- `JOIN` - Register for the current game
- `PLAY` - Get information about upcoming games
- `HELP` - Get game instructions

## 📱 WhatsApp Webhook Setup

### 1. Configure Webhook URL
Set your webhook URL in WhatsApp Business Cloud API:
```
https://your-domain.com/webhook
```

### 2. Verify Token
Use the same verify token as in your `.env` file.

### 3. Test Webhook
Send a test message to verify the webhook is working.

## 🔧 API Endpoints

### Admin Endpoints
- `GET /admin/stats` - Get dashboard statistics
- `GET /admin/games` - List all games
- `POST /admin/games` - Create new game
- `POST /admin/games/:id/register` - Start game registration
- `POST /admin/games/:id/start` - Start a game
- `POST /admin/games/:id/questions` - Add questions to game

### Webhook Endpoints
- `GET /webhook` - Webhook verification
- `POST /webhook` - Receive WhatsApp messages

## 📊 Game Flow

### Registration Phase
1. Admin creates game and starts registration
2. All users receive announcement message
3. Users reply "JOIN" to register
4. System sends 30-minute and 5-minute reminders

### Game Phase
1. Game starts automatically at scheduled time
2. Players receive questions with 4 answer options
3. 10-second timer with visual countdown
4. Wrong answer or timeout = elimination
5. Game continues until 1 or fewer players remain

### Winner Determination
- Single winner: Full prize pool
- Multiple winners: Prize pool split evenly
- Winners receive direct notification

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`

2. **Redis Connection Error**
   - Ensure Redis server is running
   - Check Redis URL in `.env`

3. **WhatsApp Webhook Not Working**
   - Verify webhook URL is accessible
   - Check verify token matches
   - Ensure HTTPS is enabled for production

4. **Messages Not Sending**
   - Check WhatsApp API credentials
   - Verify phone number ID
   - Check message queue status

### Debug Commands

```bash
# Check server health
curl http://localhost:3000/health

# View queue statistics
curl -H "username: admin" -H "password: your_password" \
  http://localhost:3000/admin/queues

# Clear message queues
curl -X POST -H "username: admin" -H "password: your_password" \
  http://localhost:3000/admin/queues/clear
```

## 📈 Next Steps (Milestone 2)

- Implement real-time question delivery
- Add timer countdown functionality
- Implement elimination logic
- Add winner determination
- Test full game flow

## 🤝 Support

For issues or questions, check the logs in your terminal or contact the development team.

---

**QRush Trivia** - Making trivia exciting, one question at a time! 🎉
