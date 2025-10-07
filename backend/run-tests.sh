#!/bin/bash

echo "🧪 Running Game Fixes Verification Tests"
echo "========================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "test-game-fixes.js" ]; then
    echo "❌ test-game-fixes.js not found. Please run this script from the backend directory."
    exit 1
fi

# Install axios if not already installed
if [ ! -d "node_modules/axios" ]; then
    echo "📦 Installing axios..."
    npm install axios
fi

# Run the test
echo "🚀 Starting tests..."
node test-game-fixes.js

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
    exit 1
fi
