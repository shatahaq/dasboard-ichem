#!/bin/bash

# I-Chem VPS Setup Script
# Run this on your Google Cloud VPS (Ubuntu/Debian)

echo "🚀 Starting I-Chem Server Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
echo "🟢 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# 3. Install PM2
echo "⚡ Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Install Nginx
echo "🌐 Installing Nginx web server..."
sudo apt install -y nginx

# 5. Install Python dependencies for ML Service
echo "🐍 Installing Python & pip..."
sudo apt install -y python3-pip python3-venv

# 6. Firewall Setup
echo "🛡️ Configuring Firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw --force enable

echo "✅ Server Dependencies Installed!"
echo ""
echo "Next Steps:"
echo "1. Clone your repository: git clone https://github.com/your-username/your-repo.git"
echo "2. Install dependencies: npm install"
echo "3. Start app with PM2: pm2 start ecosystem.config.js"
