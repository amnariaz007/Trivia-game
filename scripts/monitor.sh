#!/bin/bash

# QRush Trivia Monitoring Script
# Provides real-time monitoring and health checks

echo "📊 QRush Trivia Monitoring Dashboard"
echo "=================================="

# Check PM2 status
echo "🔄 PM2 Process Status:"
pm2 status

echo ""
echo "📈 System Resources:"
echo "CPU Usage:"
top -l 1 | grep "CPU usage" || echo "CPU info not available"

echo ""
echo "Memory Usage:"
free -h 2>/dev/null || vm_stat 2>/dev/null || echo "Memory info not available"

echo ""
echo "🧵 libuv Thread Pool:"
echo "UV_THREADPOOL_SIZE: ${UV_THREADPOOL_SIZE:-16}"

echo ""
echo "💻 CPU Cores:"
nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "CPU cores info not available"

echo ""
echo "📝 Recent Logs (last 10 lines):"
pm2 logs --lines 10

echo ""
echo "🔍 Health Check:"
curl -s http://localhost:3000/health 2>/dev/null || echo "Health check endpoint not responding"

echo ""
echo "📊 Queue Statistics:"
curl -s http://localhost:3000/admin/queue-stats 2>/dev/null || echo "Queue stats not available"

echo ""
echo "🎮 Game Statistics:"
curl -s http://localhost:3000/admin/game-stats 2>/dev/null || echo "Game stats not available"

echo ""
echo "=================================="
echo "💡 Commands:"
echo "  pm2 monit     - Real-time monitoring"
echo "  pm2 logs      - View all logs"
echo "  pm2 restart   - Restart application"
echo "  pm2 reload    - Zero-downtime reload"
echo "  pm2 stop      - Stop application"
