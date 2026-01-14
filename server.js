// server.js - Custom Next.js server with Socket.io & ML predictions
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { getMqttClient, setMqttMessageCallback } = require('./lib/mqtt-client-cjs')
const { initializeFCM, checkAndNotifyStatusChanges, registerToken, unregisterToken, getTokens } = require('./lib/fcm-service')
const axios = require('axios')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true)

            // FCM API Endpoints
            if (parsedUrl.pathname === '/api/fcm/register' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const { token } = JSON.parse(body);
                        const success = registerToken(token);
                        res.writeHead(success ? 200 : 400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success, message: success ? 'Token registered' : 'Invalid token' }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
                    }
                });
                return;
            }

            if (parsedUrl.pathname === '/api/fcm/unregister' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const { token } = JSON.parse(body);
                        const success = unregisterToken(token);
                        res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success, message: success ? 'Token unregistered' : 'Token not found' }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
                    }
                });
                return;
            }

            if (parsedUrl.pathname === '/api/fcm/tokens' && req.method === 'GET') {
                const tokens = getTokens();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ tokens, count: tokens.length }));
                return;
            }

            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    // Setup Socket.io
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    })

    console.log('🚀 Setting up Socket.io server...')

    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id)

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id)
        })
    })

    // Setup MQTT client and forward messages to Socket.io
    const mqttClient = getMqttClient()

    // Define processed topic for publishing predictions
    const MQTT_PROCESSED_TOPIC = 'net4think/lab_monitor/processed'

    setMqttMessageCallback(async (data) => {
        console.log('📡 ESP32 Data:', data)

        // Broadcast raw sensor data
        io.emit('sensor_data', data)

        // Get ML predictions from Python service
        try {
            const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
                temperature: data.temperature,
                humidity: data.humidity,
                mq135_ppm: data.mq135_ppm,
                mq2_ppm: data.mq2_ppm,
                mq7_ppm: data.mq7_ppm
            }, {
                timeout: 2000
            })

            console.log('🤖 ML Predictions:', response.data)
            io.emit('predictions', response.data)

            // Check for status changes and send FCM notifications
            await checkAndNotifyStatusChanges(response.data)

            // Publish predictions to MQTT - Individual topics for ESP32
            // ESP32 subscribes to: pred_mq135, pred_mq2, pred_mq7
            mqttClient.publish('net4think/lab_monitor/pred_mq135', JSON.stringify({
                label: response.data.mq135.label,
                confidence: response.data.mq135.confidence
            }), { qos: 1 })

            mqttClient.publish('net4think/lab_monitor/pred_mq2', JSON.stringify({
                label: response.data.mq2.label,
                confidence: response.data.mq2.confidence
            }), { qos: 1 })

            mqttClient.publish('net4think/lab_monitor/pred_mq7', JSON.stringify({
                label: response.data.mq7.label,
                confidence: response.data.mq7.confidence
            }), { qos: 1 })

            console.log('📤 Published predictions to individual topics')

            // Also publish consolidated data
            const processedData = {
                timestamp: new Date().toISOString(),
                sensor_data: {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    mq135_ppm: data.mq135_ppm,
                    mq2_ppm: data.mq2_ppm,
                    mq7_ppm: data.mq7_ppm
                },
                predictions: response.data
            }

            mqttClient.publish(MQTT_PROCESSED_TOPIC, JSON.stringify(processedData), { qos: 1 }, (err) => {
                if (err) {
                    console.error('❌ MQTT Publish error:', err)
                } else {
                    console.log('📤 Published to:', MQTT_PROCESSED_TOPIC)
                }
            })

        } catch (error) {
            console.error('❌ ML Service error:', error.message)

            // Fallback to simple threshold predictions
            const fallbackPredictions = {
                mq135: {
                    label: data.mq135_ppm < 200 ? 'Baik' : 'Sedang',
                    confidence: 90
                },
                mq2: {
                    label: data.mq2_ppm < 70 ? 'AMAN' : 'BAHAYA!',
                    confidence: 90
                },
                mq7: {
                    label: data.mq7_ppm < 100 ? 'NORMAL' : 'BERBAHAYA!',
                    confidence: 90
                }
            }

            io.emit('predictions', fallbackPredictions)

            // Publish fallback predictions to individual topics for ESP32
            mqttClient.publish('net4think/lab_monitor/pred_mq135', JSON.stringify({
                label: fallbackPredictions.mq135.label,
                confidence: fallbackPredictions.mq135.confidence
            }), { qos: 1 })

            mqttClient.publish('net4think/lab_monitor/pred_mq2', JSON.stringify({
                label: fallbackPredictions.mq2.label,
                confidence: fallbackPredictions.mq2.confidence
            }), { qos: 1 })

            mqttClient.publish('net4think/lab_monitor/pred_mq7', JSON.stringify({
                label: fallbackPredictions.mq7.label,
                confidence: fallbackPredictions.mq7.confidence
            }), { qos: 1 })

            console.log('📤 Published fallback predictions to individual topics')

            // Also publish consolidated fallback data
            const fallbackData = {
                timestamp: new Date().toISOString(),
                sensor_data: data,
                predictions: fallbackPredictions,
                source: 'fallback'
            }
            mqttClient.publish(MQTT_PROCESSED_TOPIC, JSON.stringify(fallbackData), { qos: 1 })
        }
    })

    // Initialize FCM service
    initializeFCM();

    httpServer
        .once('error', (err) => {
            console.error(err)
            process.exit(1)
        })
        .listen(port, () => {
            console.log(`✅ Server ready on http://${hostname}:${port}`)
            console.log('📡 MQTT client initialized')
            console.log('🔌 Socket.io ready for connections')
            console.log(`🤖 ML Service URL: ${ML_SERVICE_URL}`)
            console.log('🔥 FCM service initialized')
        })
})
