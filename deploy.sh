#!/bin/bash

# One-Click Deployment Script for I-Chem Dashboard
# Usage: ./deploy.sh

echo "🚀 Starting I-Chem Deployment..."

# --- SYSTEM SETUP CHECK ---
echo "🔍 Checking System Dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs build-essential
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 not found. Installing..."
    sudo npm install -g pm2
fi

# Check Python Venv
if ! dpkg -l | grep -q python3-venv; then
    echo "⚠️ Python venv not found. Installing..."
    sudo apt update
    sudo apt install -y python3-pip python3-venv python3-full
fi

# Check Nginx (Optional but recommended)
if ! command -v nginx &> /dev/null; then
    echo "⚠️ Nginx not found. Installing..."
    sudo apt install -y nginx
fi

echo "✅ System Dependencies Verified!"

# --- PROJECT SETUP ---

# 1. Setup Python Virtual Environment
echo "🐍 Setting up Python ML Service..."

# Remove broken venv if exists
if [ -d "venv" ]; then
    if [ ! -f "venv/bin/activate" ]; then
        echo "⚠️  Broken venv detected. Recreating..."
        rm -rf venv
    fi
fi

if [ ! -d "venv" ]; then
    python3 -m venv venv --without-pip
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    ./venv/bin/python3 get-pip.py
    rm get-pip.py
    echo "✅ Created virtual environment 'venv'"
fi

# Install requirements using venv python explicitly
echo "📥 Installing Python requirements..."
./venv/bin/python3 -m pip install -r ml_requirements.txt

# Check if pandas/flask installed correctly
./venv/bin/python3 -c "import pandas; import flask; print('✅ Python dependencies verified')" || { echo "❌ Failed to install Python dependencies"; exit 1; }

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
pm2 startup | tail -n 1 > startup_script.sh && chmod +x startup_script.sh && ./startup_script.sh

echo "✅ Deployment Complete!"
echo "---------------------------------------------------"
echo "🌐 Web Dashboard: http://$(curl -s ifconfig.me):3000"
echo "🧠 ML Service:    Active (Background)"
echo "---------------------------------------------------"
