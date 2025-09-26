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

# Test Redis connection
echo "🔍 Testing Redis connection..."
if node scripts/test-redis-connection.js; then
  echo "✅ Redis connection test passed"
else
  echo "⚠️  Redis connection test failed, but continuing..."
fi

# Initialize database if needed (production-safe)
echo "🗄️  Initializing database..."
node scripts/init-db-production.js

# Start the backend server
echo "🚀 Starting backend server..."
npm start
