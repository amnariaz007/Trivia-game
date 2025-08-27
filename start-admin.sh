#!/bin/bash

echo "🎮 Starting QRush Trivia Admin System..."

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "📡 Starting backend server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    cd ..
    
    # Wait for backend to be ready
    echo "⏳ Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null; then
            echo "✅ Backend is ready!"
            break
        fi
        sleep 1
    done
else
    echo "✅ Backend is already running"
fi

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "🚀 QRush Trivia Admin System is starting..."
echo ""
echo "📊 Backend API: http://localhost:3000"
echo "🎨 Frontend Admin: http://localhost:3001"
echo ""
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: test123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait
