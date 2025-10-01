#!/bin/bash

# QRush Trivia Railway Deployment Script
# Optimized for Railway.com deployment

echo "🚂 Deploying QRush Trivia to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway whoami 2>/dev/null || {
    echo "Please login to Railway:"
    railway login
}

# Set environment variables for Railway
echo "⚙️ Setting up Railway environment variables..."

# Required environment variables
railway variables set NODE_ENV=production
railway variables set UV_THREADPOOL_SIZE=32
railway variables set PORT=3000

# Database and Redis (if not already set)
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL not set. Please set it in Railway dashboard."
fi

if [ -z "$REDIS_URL" ]; then
    echo "⚠️ REDIS_URL not set. Please set it in Railway dashboard."
fi

# WhatsApp configuration (if not already set)
if [ -z "$WHATSAPP_TOKEN" ]; then
    echo "⚠️ WHATSAPP_TOKEN not set. Please set it in Railway dashboard."
fi

if [ -z "$WHATSAPP_PHONE_NUMBER_ID" ]; then
    echo "⚠️ WHATSAPP_PHONE_NUMBER_ID not set. Please set it in Railway dashboard."
fi

if [ -z "$WHATSAPP_VERIFY_TOKEN" ]; then
    echo "⚠️ WHATSAPP_VERIFY_TOKEN not set. Please set it in Railway dashboard."
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

# Check deployment status
echo "📊 Checking deployment status..."
railway status

echo "✅ Deployment completed!"
echo "🔗 Your app should be available at your Railway domain"
echo "📊 Monitor: railway logs"
echo "⚙️ Variables: railway variables"
