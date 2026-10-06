#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Updating and Deploying IdeaCrop Chat..."
echo "=========================================="

# 1. Pull latest code (if using git)
if [ -d ".git" ]; then
  echo "📥 Pulling latest changes from Git..."
  git pull
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build Frontend
echo "🏗️ Building frontend..."
npm run build

# 4. Run Migrations
echo "🔄 Running migrations..."
npm run migrate || true

# 5. Restart PM2 Process
echo "🔄 Reloading PM2 process..."
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
