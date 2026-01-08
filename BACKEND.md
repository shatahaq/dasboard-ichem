# Next.js Backend dengan MQTT & WebSocket

## Cara Kerja

```
ESP32 → MQTT (broker.hivemq.com) → Node.js Server → Socket.io → React Frontend
```

### 1. Custom Server (`server.js`)
- Runs Next.js dengan custom HTTP server
- Setup Socket.io untuk WebSocket
- Initialize MQTT client

### 2. MQTT Client (`lib/mqtt-client-cjs.js`)
- Subscribe ke `net4think/lab_monitor/data`
- Parse JSON dari ESP32
- Forward ke Socket.io

### 3. Frontend (`app/page.tsx`)
- Connect ke Socket.io
- Listen untuk event `sensor_data`
- Update UI real-time

## Testing

### 1. Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 2. Check Logs

Anda akan lihat:
```
✅ Server ready on http://localhost:3000
📡 MQTT client initialized
🔌 Socket.io ready for connections
✅ MQTT Connected
📡 Subscribed to: net4think/lab_monitor/data
```

### 3. Pastikan ESP32 Running

ESP32 harus aktif dan kirim data ke MQTT.

### 4. Open Dashboard

http://localhost:3000

Data sekarang **REAL-TIME** dari ESP32!

## Troubleshooting

**Tidak ada data?**
- Check ESP32 Serial Monitor (data terkirim?)
- Check server logs (MQTT connected?)
- Check browser console (Socket.io connected?)

**Predictions tidak muncul?**
- Backend saat ini hanya forward raw data
- Prediksi via Streamlit (belum terintegrasi)
- Bisa tambahkan prediction logic di server.js
