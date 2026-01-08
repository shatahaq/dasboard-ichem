// lib/mqtt-client.ts
import mqtt from 'mqtt'

const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com'
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883')
const MQTT_TOPIC = 'net4think/lab_monitor/data'

let client: mqtt.MqttClient | null = null
let messageCallback: ((data: any) => void) | null = null

export function getMqttClient() {
    if (!client) {
        console.log(`Connecting to MQTT broker: ${MQTT_BROKER}:${MQTT_PORT}`)

        client = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`, {
            clientId: `nextjs_lab_monitor_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 5000,
        })

        client.on('connect', () => {
            console.log('✅ MQTT Connected')
            client?.subscribe(MQTT_TOPIC, (err) => {
                if (err) {
                    console.error('❌ MQTT Subscribe error:', err)
                } else {
                    console.log(`📡 Subscribed to: ${MQTT_TOPIC}`)
                }
            })
        })

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString())
                console.log('📨 MQTT Message:', data)

                if (messageCallback) {
                    messageCallback(data)
                }
            } catch (error) {
                console.error('❌ Error parsing MQTT message:', error)
            }
        })

        client.on('error', (error) => {
            console.error('❌ MQTT Error:', error)
        })

        client.on('close', () => {
            console.log('⚠️ MQTT Disconnected')
        })
    }

    return client
}

export function setMqttMessageCallback(callback: (data: any) => void) {
    messageCallback = callback
}

export function closeMqttClient() {
    if (client) {
        client.end()
        client = null
        messageCallback = null
    }
}
