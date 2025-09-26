#!/bin/bash

echo "🚀 Starting QRush Trivia Backend on Railway"
echo "=========================================="

# Set environment variables for production
export NODE_ENV=production

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install --production

# Test Railway Redis connection
echo "🔍 Testing Railway Redis connection..."
if node scripts/test-railway-redis.js; then
  echo "✅ Railway Redis test passed"
else
  echo "⚠️  Railway Redis test failed, but continuing..."
fi

# Initialize database if needed (production-safe)
echo "🗄️  Initializing database..."
if node scripts/init-db-production.js; then
  echo "✅ Database initialization completed successfully"
else
  echo "⚠️  Database initialization failed, but continuing..."
  echo "⚠️  The app will attempt to create tables on startup"
fi

# Check database tables
echo "🔍 Checking database tables..."
if node scripts/check-db-tables.js; then
  echo "✅ Database tables verified"
else
  echo "⚠️  Database table check failed, but continuing..."
fi

# Start the backend server
echo "🚀 Starting backend server..."
npm start
