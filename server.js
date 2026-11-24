// server.js - Custom Next.js server with Socket.io, MQTT, and ML predictions
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const {
    getMqttClient,
    setMqttMessageCallback,
    setMqttStatusCallback,
    getMqttConnectionState,
    MQTT_PREDICTION_TOPICS
} = require('./lib/mqtt-client-cjs')
const {
    initializeFCM,
    checkAndNotifyStatusChanges,
    registerToken,
    unregisterToken,
    getTokens
} = require('./lib/fcm-service')
const axios = require('axios')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000'
const SENSOR_FRESHNESS_MS = parseInt(process.env.SENSOR_FRESHNESS_MS || '5000', 10)
const MQTT_PROCESSED_TOPIC = process.env.MQTT_PROCESSED_TOPIC || 'net4think/lab_monitor/processed'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let mqttStatus = getMqttConnectionState()
let lastSensorAt = null
let mlAvailable = null
let mlLastCheckedAt = null

function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function normalizeSensorData(data) {
    if (!data || typeof data !== 'object') {
        return null
    }

    const normalized = {
        temperature: toFiniteNumber(data.temperature),
        humidity: toFiniteNumber(data.humidity),
        mq135_ppm: toFiniteNumber(data.mq135_ppm),
        mq2_ppm: toFiniteNumber(data.mq2_ppm),
        mq7_ppm: toFiniteNumber(data.mq7_ppm),
        received_at: new Date().toISOString()
    }

    const hasRequiredGasReadings = ['mq135_ppm', 'mq2_ppm', 'mq7_ppm']
        .every((key) => normalized[key] !== null)

    return hasRequiredGasReadings ? normalized : null
}

function clampConfidence(value) {
    const confidence = Number(value)

    if (!Number.isFinite(confidence)) {
        return 0
    }

    return Math.max(0, Math.min(100, confidence))
}

function normalizePredictionLabel(sensor, label) {
    const raw = String(label || '').trim()

    if (!raw) {
        return 'Menunggu...'
    }

    const normalized = raw
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/!+/g, '')

    if (sensor === 'mq135') {
        if (normalized === 'baik') return 'Baik'
        if (normalized === 'sedang') return 'Sedang'
        if (normalized === 'tidak_sehat') return 'Tidak_Sehat'
        if (normalized === 'berbahaya' || normalized === 'bahaya') return 'Berbahaya'
        return raw
    }

    if (sensor === 'mq2') {
        if (['aman', 'normal', 'no_smoke', 'safe'].includes(normalized)) return 'AMAN'
        if (['bahaya', 'berbahaya', 'smoke', 'danger', 'unsafe'].includes(normalized)) return 'BAHAYA!'
        return raw.toUpperCase()
    }

    if (sensor === 'mq7') {
        if (['aman', 'normal', 'no_smoke', 'no_gas', 'safe'].includes(normalized)) return 'NORMAL'
        if (['bahaya', 'berbahaya', 'smoke', 'gas', 'co', 'danger', 'unsafe'].includes(normalized)) return 'BERBAHAYA!'
        return raw.toUpperCase()
    }

    return raw
}

function normalizePredictions(predictions) {
    return {
        mq135: {
            label: normalizePredictionLabel('mq135', predictions && predictions.mq135 && predictions.mq135.label),
            confidence: clampConfidence(predictions && predictions.mq135 && predictions.mq135.confidence)
        },
        mq2: {
            label: normalizePredictionLabel('mq2', predictions && predictions.mq2 && predictions.mq2.label),
            confidence: clampConfidence(predictions && predictions.mq2 && predictions.mq2.confidence)
        },
        mq7: {
            label: normalizePredictionLabel('mq7', predictions && predictions.mq7 && predictions.mq7.label),
            confidence: clampConfidence(predictions && predictions.mq7 && predictions.mq7.confidence)
        }
    }
}

function classifyMq135(value) {
    if (value < 200) return 'Baik'
    if (value < 350) return 'Sedang'
    if (value < 500) return 'Tidak_Sehat'
    return 'Berbahaya'
}

function getFallbackPredictions(sensorData) {
    return {
        mq135: {
            label: classifyMq135(sensorData.mq135_ppm),
            confidence: 75
        },
        mq2: {
            label: sensorData.mq2_ppm < 70 ? 'AMAN' : 'BAHAYA!',
            confidence: 75
        },
        mq7: {
            label: sensorData.mq7_ppm < 100 ? 'NORMAL' : 'BERBAHAYA!',
            confidence: 75
        }
    }
}

function publishPredictions(mqttClient, predictions) {
    Object.entries(MQTT_PREDICTION_TOPICS).forEach(([sensor, topic]) => {
        const prediction = predictions[sensor]

        if (!prediction) {
            return
        }

        mqttClient.publish(topic, JSON.stringify({
            label: prediction.label,
            confidence: prediction.confidence
        }), { qos: 1 }, (err) => {
            if (err) {
                console.error(`MQTT publish error for ${topic}:`, err)
            }
        })
    })
}

function getSystemStatus() {
    const now = Date.now()
    const sensorAgeMs = lastSensorAt ? now - lastSensorAt : null

    return {
        mqtt: {
            ...getMqttConnectionState(),
            lastEvent: mqttStatus.event || null,
            error: mqttStatus.error || null,
            lastEventAt: mqttStatus.timestamp || null
        },
        sensor: {
            lastDataAt: lastSensorAt ? new Date(lastSensorAt).toISOString() : null,
            ageMs: sensorAgeMs,
            fresh: sensorAgeMs !== null && sensorAgeMs <= SENSOR_FRESHNESS_MS,
            freshnessMs: SENSOR_FRESHNESS_MS
        },
        ml: {
            available: mlAvailable,
            lastCheckedAt: mlLastCheckedAt
        }
    }
}

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true)

            if (parsedUrl.pathname === '/api/fcm/register' && req.method === 'POST') {
                let body = ''
                req.on('data', (chunk) => { body += chunk.toString() })
                req.on('end', () => {
                    try {
                        const { token } = JSON.parse(body)
                        const success = registerToken(token)
                        res.writeHead(success ? 200 : 400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success, message: success ? 'Token registered' : 'Invalid token' }))
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success: false, message: 'Invalid request body' }))
                    }
                })
                return
            }

            if (parsedUrl.pathname === '/api/fcm/unregister' && req.method === 'POST') {
                let body = ''
                req.on('data', (chunk) => { body += chunk.toString() })
                req.on('end', () => {
                    try {
                        const { token } = JSON.parse(body)
                        const success = unregisterToken(token)
                        res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success, message: success ? 'Token unregistered' : 'Token not found' }))
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success: false, message: 'Invalid request body' }))
                    }
                })
                return
            }

            if (parsedUrl.pathname === '/api/fcm/tokens' && req.method === 'GET') {
                const tokens = getTokens()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ tokens, count: tokens.length }))
                return
            }

            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    })

    const broadcastSystemStatus = () => {
        io.emit('system_status', getSystemStatus())
    }

    console.log('Setting up Socket.io server')

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)
        socket.emit('system_status', getSystemStatus())

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id)
        })
    })

    const mqttClient = getMqttClient()

    setMqttStatusCallback((status) => {
        mqttStatus = status
        broadcastSystemStatus()
    })

    setMqttMessageCallback(async (data) => {
        const sensorData = normalizeSensorData(data)

        if (!sensorData) {
            console.warn('Ignored MQTT payload with missing gas readings:', data)
            return
        }

        console.log('ESP32 data:', sensorData)

        lastSensorAt = Date.now()
        io.emit('sensor_data', sensorData)
        broadcastSystemStatus()

        try {
            const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
                temperature: sensorData.temperature,
                humidity: sensorData.humidity,
                mq135_ppm: sensorData.mq135_ppm,
                mq2_ppm: sensorData.mq2_ppm,
                mq7_ppm: sensorData.mq7_ppm
            }, {
                timeout: 2000
            })

            mlAvailable = true
            mlLastCheckedAt = new Date().toISOString()

            const predictions = normalizePredictions(response.data)
            console.log('ML predictions:', predictions)

            io.emit('predictions', predictions)
            await checkAndNotifyStatusChanges(predictions)
            publishPredictions(mqttClient, predictions)
            console.log('Published predictions to ESP32 MQTT topics')

            const processedData = {
                timestamp: new Date().toISOString(),
                sensor_data: sensorData,
                predictions
            }

            mqttClient.publish(MQTT_PROCESSED_TOPIC, JSON.stringify(processedData), { qos: 1 }, (err) => {
                if (err) {
                    console.error('MQTT processed publish error:', err)
                } else {
                    console.log('Published processed data to:', MQTT_PROCESSED_TOPIC)
                }
            })

            broadcastSystemStatus()
        } catch (error) {
            mlAvailable = false
            mlLastCheckedAt = new Date().toISOString()

            console.error('ML service error:', error.message)

            const fallbackPredictions = getFallbackPredictions(sensorData)
            io.emit('predictions', fallbackPredictions)
            await checkAndNotifyStatusChanges(fallbackPredictions)
            publishPredictions(mqttClient, fallbackPredictions)
            console.log('Published fallback predictions to ESP32 MQTT topics')

            const fallbackData = {
                timestamp: new Date().toISOString(),
                sensor_data: sensorData,
                predictions: fallbackPredictions,
                source: 'fallback'
            }

            mqttClient.publish(MQTT_PROCESSED_TOPIC, JSON.stringify(fallbackData), { qos: 1 })
            broadcastSystemStatus()
        }
    })

    initializeFCM()

    const statusInterval = setInterval(broadcastSystemStatus, 2000)
    statusInterval.unref()

    httpServer
        .once('error', (err) => {
            console.error(err)
            process.exit(1)
        })
        .listen(port, hostname, () => {
            console.log(`Server ready on http://${hostname}:${port}`)
            console.log('MQTT client initialized')
            console.log('Socket.io ready for connections')
            console.log(`ML Service URL: ${ML_SERVICE_URL}`)
            console.log('FCM service initialized')
        })
})
