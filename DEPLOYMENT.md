# Deployment Guide - Google Cloud Platform

## Prerequisites

- Google Cloud Compute Engine instance (e2-medium or higher)
- Domain name with DNS configured
- SSH access to your GCP instance

## Step 1: Server Setup

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install PM2

```bash
sudo npm install -g pm2
```

## Step 2: Upload Project

### Clone from GitHub

```bash
git clone https://github.com/your-username/nextjs-lab-monitor.git
cd nextjs-lab-monitor
```

### Install Dependencies

```bash
npm install
```

### Build for Production

```bash
npm run build
```

## Step 3: Configure PM2

### Create Ecosystem File

```bash
pm2 ecosystem
```

Edit `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'lab-monitor',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 4: Nginx Reverse Proxy

### Install Nginx

```bash
sudo apt install -y nginx
```

### Configure Site

Create `/etc/nginx/sites-available/lab-monitor`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/lab-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## Step 6: Firewall Configuration

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Step 7: Environment Variables

Create `.env.local`:

```bash
MQTT_BROKER=broker.hivemq.com
MQTT_PORT=1883
NEXT_PUBLIC_WS_URL=wss://yourdomain.com
```

Restart PM2:

```bash
pm2 restart all
```

## Monitoring

```bash
# View logs
pm2 logs lab-monitor

# Monitor status
pm2 monit

# Restart if needed
pm2 restart lab-monitor
```

## Auto-Restart on Reboot

```bash
pm2 startup
pm2 save
```

## ✅ Done!

Your dashboard should now be accessible at `https://yourdomain.com`

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Check PM2 Status
```bash
pm2 status
```

### View PM2 Logs
```bash
pm2 logs lab-monitor --lines 100
```
