# ML Service with Real Models

## Setup

### 1. Install Python Dependencies

```bash
pip install -r ml_requirements.txt
```

### 2. Copy Model Files

Model files sudah dicopy:
- `air_quality_rf_model.joblib`
- `model_mq2.joblib`
- `model_mq7.joblib`

### 3. Start ML Service

```bash
python ml_service.py
```

Service akan run di: **http://localhost:5000**

### 4. Install Node.js Dependencies

```bash
npm install
```

### 5. Start Next.js Server

```bash
npm run dev
```

Server akan run di: **http://localhost:3000**

---

## Architecture

```
ESP32 → MQTT → Node.js Server → Python ML Service
                    ↓              ↓
                Socket.io ← Predictions
                    ↓
                React Frontend
```

### Flow:

1. ESP32 kirim data via MQTT
2. Node.js server terima data
3. Node.js forward data ke frontend (Socket.io)
4. Node.js call Python ML service untuk predictions
5. Python return predictions
6. Node.js broadcast predictions ke frontend

---

## API Endpoints

### ML Service (Port 5000)

**POST /predict**
```json
{
  "mq135_ppm": 174.6,
  "mq2_ppm": 48.1,
  "mq7_ppm": 81.5
}
```

Response:
```json
{
  "mq135": {"label": "Baik", "confidence": 98.9},
  "mq2": {"label": "AMAN", "confidence": 100.0},
  "mq7": {"label": "NORMAL", "confidence": 97.5}
}
```

**GET /health**
Check if service is running

---

## Fallback

Jika ML Service down, Node.js akan fallback ke **threshold-based predictions**:
- MQ-135: < 200 ppm = Baik
- MQ-2: < 70 ppm = AMAN
- MQ-7: < 100 ppm = NORMAL

---

## Production Deployment

### Option 1: Same Server
Run both services di server yang sama:
```bash
# Terminal 1
python ml_service.py

# Terminal 2  
npm start
```

### Option 2: Separate Servers
Set environment variable:
```bash
export ML_SERVICE_URL=http://ml-server-ip:5000
npm start
```

### Option 3: Systemd Services

Create `/etc/systemd/system/ml-service.service`:
```ini
[Unit]
Description=ML Prediction Service

[Service]
WorkingDirectory=/path/to/nextjs-lab-monitor
ExecStart=/usr/bin/python3 ml_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable ml-service
sudo systemctl start ml-service
```
