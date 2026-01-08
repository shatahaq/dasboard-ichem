# Lab Monitor AI Dashboard - Next.js

Modern, real-time air quality monitoring dashboard with ML predictions.

## ✨ Features

- 🎨 **Modern UI** with Glassmorphism & Dark Mode
- ⚡ **Real-time Updates** via WebSocket
- 📊 **Interactive Charts** with smooth animations
- 🤖 **ML Predictions** for 3 sensors (MQ-135, MQ-2, MQ-7)
- 📱 **Fully Responsive** design
- 🔔 **Live Alerts** for dangerous conditions

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
nextjs-lab-monitor/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Dashboard page
│   ├── globals.css      # Global styles
│   └── api/             # API routes (to be implemented)
├── components/
│   ├── SensorCard.tsx
│   ├── EnvironmentCard.tsx
│   └── ChartSection.tsx
└── lib/
    └── utils.ts
```

## 🌐 Deployment to Google Cloud

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📊 Tech Stack

- **Framework:** Next.js 14
- **Styling:** TailwindCSS
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Real-time:** Socket.io
- **MQTT:** mqtt.js

## 📝 Environment Variables

```env
MQTT_BROKER=broker.hivemq.com
MQTT_PORT=1883
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## 🔗 Integration

Dashboard receives data from ESP32 via MQTT and displays:
- Temperature & Humidity (DHT22)
- MQ-135 (Air Quality)
- MQ-2 (Smoke Detection)
- MQ-7 (CO/Gas Detection)

ML predictions are performed in real-time using pre-trained models.
