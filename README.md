# 🎮 QRush Trivia - Complete System

A complete WhatsApp trivia game system with sudden-death elimination mechanics, featuring a modern admin dashboard.

## 📁 Project Structure

```
Trivia game/
├── backend/              # Node.js Backend API
│   ├── app.js           # Main server file
│   ├── config/          # Database & WhatsApp config
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── scripts/         # Database scripts
│   ├── public/          # Static files
│   └── package.json     # Backend dependencies
├── frontend/            # Next.js Admin Dashboard
│   ├── src/
│   │   ├── app/         # Next.js App Router
│   │   ├── components/  # React components
│   │   ├── contexts/    # Authentication context
│   │   └── services/    # API service layer
│   └── package.json     # Frontend dependencies
└── start-admin.sh       # Startup script
```

## 🚀 Quick Start

### **Option 1: Use the Startup Script (Recommended)**
   ```bash
./start-admin.sh
   ```

### **Option 2: Manual Start**
   ```bash
# Terminal 1 - Start Backend
cd backend
npm start

# Terminal 2 - Start Frontend
cd frontend
   npm run dev
   ```

## 🌐 Access Points

- **Backend API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **Health Check**: http://localhost:3000/health

## 🔐 Default Credentials
- **Username**: `admin`
- **Password**: `test123`

## 📋 Milestone 1 - Setup & Foundations ✅

### Deliverables Completed:
1. ✅ **WhatsApp Business Cloud API** with webhook integration
2. ✅ **Redis queue** for high-volume message handling
3. ✅ **Database structure** (users, nicknames, responses, results)
4. ✅ **One-time signup flow** (nickname + WhatsApp number as ID)
5. ✅ **Modern Admin Dashboard** (Next.js + TypeScript)

## 🛠️ Backend Features

### **Core Functionality**
- **User Management**: Registration, nickname collection, activity tracking
- **Game Management**: Create, schedule, and manage trivia games
- **Question Management**: Add multiple-choice questions to games
- **Notification System**: Automated reminders and announcements
- **Queue System**: High-volume message processing with Redis
- **Database**: Complete data persistence with PostgreSQL

### **API Endpoints**
- `GET /health` - Server health check
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/games` - List all games
- `POST /admin/games` - Create new game
- `POST /admin/games/:id/register` - Start game registration
- `POST /admin/games/:id/start` - Start a game
- `POST /admin/games/:id/questions` - Add questions
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - Process WhatsApp messages

## 🎨 Frontend Features

### **Admin Dashboard**
- **Authentication**: Secure login with session management
- **Statistics**: Real-time user counts and game status
- **Game Creation**: Intuitive game setup interface
- **Question Management**: JSON-based question input
- **Game Management**: Visual status indicators and controls
- **Responsive Design**: Works on desktop and mobile

### **Tech Stack**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API

## 📱 Game Flow

### **Player Registration**
1. **Game Announcement**: Admin starts registration → All users get announcement
2. **Opt-in**: Users reply "JOIN" to register for the game
3. **30-minute Reminder**: System automatically sends reminder
4. **5-minute Reminder**: Final reminder before game starts
5. **Game Start**: Players receive questions and can start playing

### **Game Mechanics**
- **Sudden-Death**: One wrong answer = elimination
- **10-Second Timers**: Visual countdown with progress indicators
- **Randomized Answers**: Different order for each player
- **Prize Splitting**: Automatic division for multiple winners
- **Real-time Messaging**: WhatsApp integration with webhooks

## 🗄️ Database Schema

### **Tables**
- **users**: User registration and nicknames
- **games**: Game sessions and state
- **questions**: Trivia questions and answers
- **game_players**: Player participation and elimination
- **player_answers**: Individual answer tracking

### **Key Relationships**
- Games have many Questions
- Games have many GamePlayers
- Users have many GamePlayers
- Questions have many PlayerAnswers

## 🔧 Setup Instructions

### **Prerequisites**
- Node.js 16+
- PostgreSQL database
- Redis server
- WhatsApp Business Cloud API account

### **Backend Setup**
```bash
cd backend
cp env.example .env
# Edit .env with your credentials
npm install
npm run init-db
npm start
```

### **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

### **Environment Configuration**
```env
# Backend (.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qrush_trivia
DB_USER=apple
DB_PASSWORD=
REDIS_URL=redis://localhost:6379
WHATSAPP_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=test123

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🧪 Testing

### **Backend Testing**
```bash
cd backend
npm run setup-test
curl http://localhost:3000/health
curl -H "username: admin" -H "password: test123" http://localhost:3000/admin/stats
```

### **Frontend Testing**
1. Open http://localhost:3001
2. Login with admin/test123
3. Create a test game
4. Add questions
5. Start registration

## 🚀 Deployment

### **Backend Deployment**
```bash
cd backend
npm run build
npm start
```

### **Frontend Deployment**
```bash
cd frontend
npm run build
npm start
```

### **Production Considerations**
- Set up proper SSL/TLS certificates
- Configure production database
- Set up Redis cluster
- Configure WhatsApp production environment
- Set up monitoring and logging

## 📈 Next Steps (Milestone 2)

- Implement real-time question delivery
- Add timer countdown functionality
- Implement elimination logic
- Add winner determination
- Test full game flow

## 🤝 Support

For issues or questions:
- Check the logs in your terminal
- Review the health endpoints
- Contact the development team

---

**QRush Trivia** - Making trivia exciting, one question at a time! 🎉

**Status**: ✅ Milestone 1 Complete - Ready for Milestone 2
