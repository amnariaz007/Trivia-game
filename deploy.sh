#!/bin/bash

echo "🚀 Deploying QRush Trivia Website to qrushtrivia.com"
echo "=================================================="

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your website should be available at qrushtrivia.com"
echo "📧 Business email: admin@qrushtrivia.com"
echo "📞 Business phone: (773) 543-2202"
echo "📍 Business address: 6837 Yellowstone Blvd, Queens, NY 11375"
echo ""
echo "🔧 Next steps:"
echo "1. Configure custom domain in Vercel dashboard"
echo "2. Update DNS records in Namesilo"
echo "3. Test the website for META business verification"
