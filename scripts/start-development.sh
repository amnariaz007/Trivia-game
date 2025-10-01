#!/bin/bash

# QRush Trivia Development Start Script
# Single process mode for development

echo "🛠️ Starting QRush Trivia in Development Mode..."

# Set environment variables for development
export NODE_ENV=development
export UV_THREADPOOL_SIZE=16

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️ .env file not found. Please create backend/.env from backend/env.example"
    echo "📝 Copying env.example to .env..."
    cp backend/env.example backend/.env
    echo "✅ Please edit backend/.env with your configuration"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd backend && npm install && cd ..
fi

# Create logs directory
mkdir -p logs

# Start application in development mode
echo "🔄 Starting application in development mode..."
cd backend && npm start
