#!/bin/bash

echo "🚀 Starting I-Chem Project Deployment..."

# 1. Setup Python Virtual Environment
echo "🐍 Setting up Python ML Service..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created virtual environment 'venv'"
fi

# Activate venv and install requirements
source venv/bin/activate
pip install -r ml_requirements.txt
# Check if pandas/flask installed correctly
python3 -c "import pandas; import flask; print('Python dependencies verified')"

# 2. Setup Node.js Application
echo "📦 Installing Node.js dependencies..."
npm install

echo "🏗️ Building Next.js application..."
npm run build

# 3. Start Services with PM2
echo "⚡ Starting services via PM2..."

# Update ecosystem to use venv python
sed -i 's|interpreter: .*,|interpreter: "./venv/bin/python",|g' ecosystem.config.js

# Start/Restart
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment Complete!"
echo "Web Dashboard: http://YOUR_SERVER_IP:3000"
echo "ML Service: Process 'ichem-ml' is running in background"
