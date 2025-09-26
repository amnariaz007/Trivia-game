# Railway Deployment Guide for QRush Trivia

## Overview
This guide will help you deploy the QRush Trivia backend API to Railway. The frontend (Next.js admin dashboard) should be deployed separately to Vercel or another platform.

## Prerequisites
- Railway account
- PostgreSQL database (Railway provides this)
- Redis instance (Railway provides this)
- WhatsApp Business API credentials

## Environment Variables
Set these in your Railway project settings:

### Required Variables
```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway
REDIS_URL=redis://default:password@redis.railway.internal:6379
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_API_VERSION=v18.0
```

### Optional Variables
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DEFAULT_PRIZE_POOL=100
QUESTION_TIMER=10
MAX_PLAYERS=100
```

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add Services
1. **PostgreSQL Database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

2. **Redis Cache**:
   - Click "New" → "Database" → "Redis"
   - Railway will automatically set `REDIS_URL`

### 3. Configure Environment Variables
1. Go to your service settings
2. Add all the environment variables listed above
3. Make sure to use your actual WhatsApp credentials

### 4. Deploy
1. Railway will automatically detect the `start.sh` script
2. The deployment will:
   - Install backend dependencies
   - Initialize the database with tables
   - Start the Express server

## File Structure for Railway
```
/
├── backend/                 # Main backend application
│   ├── app.js              # Express server entry point
│   ├── package.json        # Backend dependencies
│   ├── config/             # Database and WhatsApp config
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── scripts/            # Database initialization
├── start.sh                # Railway start script
├── railway.json            # Railway configuration
├── .railwayignore          # Files to ignore during deployment
└── package.json            # Root package.json for monorepo
```

## Key Files Created for Railway

### start.sh
- Installs backend dependencies
- Initializes database safely for production
- Starts the Express server

### railway.json
- Configures Railway build and deployment settings
- Specifies the start command

### .railwayignore
- Excludes frontend files (deploy separately)
- Excludes development files and documentation

## Post-Deployment

### 1. Verify Deployment
- Check Railway logs for successful startup
- Visit `https://your-app.railway.app/health` to verify the API is running

### 2. Configure WhatsApp Webhook
- Set your webhook URL to: `https://your-app.railway.app/webhook`
- Use your `WHATSAPP_VERIFY_TOKEN` for verification

### 3. Test API Endpoints
- Health check: `GET /health`
- Admin login: `POST /admin/login`
- Webhook: `POST /webhook`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` is correctly set
   - Ensure PostgreSQL service is running

2. **WhatsApp Configuration Error**
   - Verify all WhatsApp environment variables
   - Check token permissions and expiration

3. **Port Issues**
   - Railway automatically sets `PORT` environment variable
   - Your app.js already uses `process.env.PORT || 3002`

4. **Build Failures**
   - Check Railway build logs
   - Ensure all dependencies are in package.json

### Logs
- View deployment logs in Railway dashboard
- Check application logs for runtime errors
- Monitor database and Redis connections

## Frontend Deployment
The frontend (Next.js admin dashboard) should be deployed separately:

1. **Vercel** (Recommended):
   ```bash
   cd frontend
   npm run deploy
   ```

2. **Update API URLs**:
   - Change API base URL in frontend to your Railway app URL
   - Update CORS settings in backend if needed

## Security Notes
- Never commit `.env` files
- Use strong passwords for admin accounts
- Regularly rotate WhatsApp access tokens
- Monitor API usage and implement rate limiting

## Support
- Railway Documentation: https://docs.railway.app
- Check Railway community for deployment issues
- Monitor application health and performance
