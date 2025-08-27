# QRush Trivia Admin Frontend

A modern Next.js admin dashboard for managing the QRush Trivia WhatsApp game.

## Features

- 🔐 **Secure Authentication** - Login system with session management
- 📊 **Real-time Statistics** - View user counts, active games, and recent activity
- 🎮 **Game Management** - Create, schedule, and manage trivia games
- ❓ **Question Management** - Add multiple-choice questions to games
- 👥 **User Management** - View registered users and their activity
- 📱 **WhatsApp Integration** - Manage game announcements and registrations

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Authentication**: Client-side session management

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend server running (see main README)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Start both frontend and backend:**
   ```bash
   npm run dev-full
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

## Usage

### Login

- **URL**: `http://localhost:3001/login`
- **Default credentials**:
  - Username: `admin`
  - Password: `test123`

### Dashboard Features

1. **Statistics Overview**
   - Total registered users
   - Active game status
   - Recent game history

2. **Create New Game**
   - Set start time and date
   - Configure prize pool
   - Define number of questions

3. **Add Questions**
   - JSON format question input
   - Multiple choice options (A, B, C, D)
   - Correct answer specification

4. **Game Management**
   - View all games with status indicators
   - Start registration process
   - Launch games
   - View game details

## API Integration

The frontend communicates with the backend API at `http://localhost:3000`. All API calls include authentication headers and handle errors gracefully.

### Key API Endpoints

- `GET /admin/stats` - Dashboard statistics
- `GET /admin/games` - List all games
- `POST /admin/games` - Create new game
- `POST /admin/games/:id/register` - Start game registration
- `POST /admin/games/:id/start` - Start a game
- `POST /admin/games/:id/questions` - Add questions

## Development

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── dashboard/       # Main dashboard page
│   ├── login/          # Login page
│   └── layout.tsx      # Root layout
├── components/         # Reusable React components
├── contexts/          # React Context providers
├── services/          # API service layer
└── middleware.ts      # Next.js middleware
```

### Adding New Features

1. **Create new components** in `src/components/`
2. **Add API methods** in `src/services/api.ts`
3. **Update types** as needed
4. **Test thoroughly** with the backend

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Setup

- Set `NEXT_PUBLIC_API_URL` to your production backend URL
- Ensure CORS is configured on the backend
- Set up proper authentication for production

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Ensure backend is running on port 3000
   - Check CORS configuration
   - Verify API endpoints

2. **Authentication Issues**
   - Clear browser localStorage
   - Check credentials
   - Verify backend authentication

3. **Build Errors**
   - Check TypeScript types
   - Verify all imports
   - Clear `.next` folder and rebuild

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Add proper error handling
4. Test all features thoroughly
5. Update documentation as needed

---

**QRush Trivia Admin** - Modern admin interface for WhatsApp trivia games! 🎮
