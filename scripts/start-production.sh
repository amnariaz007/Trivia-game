#!/bin/bash

# QRush Trivia Production Start Script
# Optimized for 1000+ concurrent users with PM2 cluster mode

echo "🚀 Starting QRush Trivia in Production Mode..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Set environment variables for production
export NODE_ENV=production
export UV_THREADPOOL_SIZE=32

# Check if ecosystem file exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ecosystem.config.js not found!"
    exit 1
fi

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start application with PM2
echo "🔄 Starting application with PM2 cluster mode..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (for server reboots)
pm2 startup

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show logs
echo "📝 Recent logs:"
pm2 logs --lines 20

echo "✅ QRush Trivia started successfully!"
echo "🔗 Health check: http://localhost:3000/health"
echo "📊 Monitor: pm2 monit"
echo "📝 Logs: pm2 logs"
