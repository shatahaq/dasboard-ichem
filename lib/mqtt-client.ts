// lib/mqtt-client.ts
import mqtt from 'mqtt'

const MQTT_BROKER = process.env.MQTT_BROKER || 'broker.hivemq.com'
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10)
export const MQTT_DATA_TOPIC = process.env.MQTT_DATA_TOPIC || 'net4think/lab_monitor/data'
export const MQTT_PREDICTION_TOPICS = {
    mq135: process.env.MQTT_PRED_MQ135_TOPIC || 'net4think/lab_monitor/pred_mq135',
    mq2: process.env.MQTT_PRED_MQ2_TOPIC || 'net4think/lab_monitor/pred_mq2',
    mq7: process.env.MQTT_PRED_MQ7_TOPIC || 'net4think/lab_monitor/pred_mq7'
}

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
            console.log('MQTT connected')
            client?.subscribe(MQTT_DATA_TOPIC, (err) => {
                if (err) {
                    console.error('MQTT subscribe error:', err)
                } else {
                    console.log(`Subscribed to MQTT topic: ${MQTT_DATA_TOPIC}`)
                }
            })
        })

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString())
                console.log('MQTT message:', data)

                if (messageCallback) {
                    messageCallback(data)
                }
            } catch (error) {
                console.error('Error parsing MQTT message:', error)
            }
        })

        client.on('error', (error) => {
            console.error('MQTT error:', error)
        })

        client.on('close', () => {
            console.log('MQTT disconnected')
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
