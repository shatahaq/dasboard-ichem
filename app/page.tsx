'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Thermometer, Droplets, Wind, Flame, Skull, Leaf, Wifi, WifiOff, Server, Cpu } from 'lucide-react'
import SensorCard from '@/components/SensorCard'
import EnvironmentCard from '@/components/EnvironmentCard'
import ChartSection from '@/components/ChartSection'
import { io, type Socket } from 'socket.io-client'
import Image from 'next/image'

interface SensorData {
    temperature: number | null
    humidity: number | null
    mq135_ppm: number | null
    mq2_ppm: number | null
    mq7_ppm: number | null
    timestamp: string
}

interface Prediction {
    label: string
    confidence: number
}

interface Predictions {
    mq135: Prediction
    mq2: Prediction
    mq7: Prediction
}

interface SystemStatus {
    mqtt?: {
        connected: boolean
        broker: string
        port: number
        topic: string
        lastEvent?: string | null
        error?: string | null
        lastEventAt?: string | null
    }
    sensor?: {
        lastDataAt: string | null
        ageMs: number | null
        fresh: boolean
        freshnessMs: number
    }
    ml?: {
        available: boolean | null
        lastCheckedAt: string | null
    }
}

const waitingPrediction = { label: 'Menunggu...', confidence: 0 }

const initialSensorData: SensorData = {
    temperature: null,
    humidity: null,
    mq135_ppm: null,
    mq2_ppm: null,
    mq7_ppm: null,
    timestamp: '-'
}

const initialPredictions: Predictions = {
    mq135: waitingPrediction,
    mq2: waitingPrediction,
    mq7: waitingPrediction
}

function toFiniteNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function formatTime(value: unknown) {
    if (typeof value !== 'string') {
        return new Date().toLocaleTimeString('id-ID', { hour12: false })
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? new Date().toLocaleTimeString('id-ID', { hour12: false })
        : date.toLocaleTimeString('id-ID', { hour12: false })
}

function normalizePrediction(value: unknown): Prediction {
    if (!value || typeof value !== 'object') {
        return waitingPrediction
    }

    const prediction = value as Partial<Prediction>
    const confidence = Number(prediction.confidence)

    return {
        label: typeof prediction.label === 'string' && prediction.label.trim()
            ? prediction.label.trim()
            : waitingPrediction.label,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0
    }
}

export default function Dashboard() {
    const [sensorData, setSensorData] = useState<SensorData>(initialSensorData)
    const [predictions, setPredictions] = useState<Predictions>(initialPredictions)
    const [history, setHistory] = useState<SensorData[]>([])
    const [socketConnected, setSocketConnected] = useState(false)
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

    useEffect(() => {
        const socket: Socket = io()

        socket.on('connect', () => {
            console.log('Socket.io connected')
            setSocketConnected(true)
        })

        socket.on('disconnect', () => {
            console.log('Socket.io disconnected')
            setSocketConnected(false)
        })

        socket.on('system_status', (status: SystemStatus) => {
            setSystemStatus(status)
        })

        socket.on('sensor_data', (data: any) => {
            console.log('Received ESP32 data:', data)

            const updatedData: SensorData = {
                temperature: toFiniteNumber(data.temperature),
                humidity: toFiniteNumber(data.humidity),
                mq135_ppm: toFiniteNumber(data.mq135_ppm),
                mq2_ppm: toFiniteNumber(data.mq2_ppm),
                mq7_ppm: toFiniteNumber(data.mq7_ppm),
                timestamp: formatTime(data.received_at)
            }

            setSensorData(updatedData)
            setHistory((prev) => [...prev.slice(-50), updatedData])
        })

        socket.on('predictions', (preds: Partial<Predictions>) => {
            console.log('ML predictions received:', preds)
            setPredictions({
                mq135: normalizePrediction(preds?.mq135),
                mq2: normalizePrediction(preds?.mq2),
                mq7: normalizePrediction(preds?.mq7)
            })
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    const mqttConnected = Boolean(systemStatus?.mqtt?.connected)
    const sensorFresh = Boolean(systemStatus?.sensor?.fresh)
    const mlAvailable = systemStatus?.ml?.available

    const connectionState = (() => {
        if (!socketConnected) {
            return {
                label: 'Dashboard Offline',
                detail: 'Socket disconnected',
                Icon: WifiOff,
                textClass: 'text-red-600',
                dotClass: 'bg-red-500'
            }
        }

        if (!mqttConnected) {
            return {
                label: 'MQTT Offline',
                detail: 'Broker not connected',
                Icon: WifiOff,
                textClass: 'text-red-600',
                dotClass: 'bg-red-500'
            }
        }

        if (!sensorFresh) {
            return {
                label: 'Waiting Sensor',
                detail: 'No recent ESP32 data',
                Icon: Activity,
                textClass: 'text-amber-600',
                dotClass: 'bg-amber-500 animate-pulse'
            }
        }

        return {
            label: 'Live',
            detail: 'ESP32 data active',
            Icon: Wifi,
            textClass: 'text-brand-600',
            dotClass: 'bg-brand-500 animate-pulse'
        }
    })()

    const ConnectionIcon = connectionState.Icon

    return (
        <div className="min-h-screen">
            <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="professional-header sticky top-0 z-50 backdrop-blur-sm bg-white/95"
            >
                <div className="max-w-7xl mx-auto px-4 py-3 md:px-8 md:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="relative shrink-0"
                            >
                                <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl overflow-hidden bg-white border-2 border-brand-500 logo-glow">
                                    <Image
                                        src="/ichem-logo.jpg"
                                        alt="IC Lab Monitor"
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-contain p-1"
                                        priority
                                    />
                                </div>
                            </motion.div>

                            <div className="min-w-0">
                                <h1 className="text-lg md:text-3xl font-bold text-green-gradient leading-tight">
                                    I-Chem
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600 font-medium hidden md:block">
                                    AI-Powered Environmental Monitoring
                                </p>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="status-badge px-3 py-1.5 md:px-4 md:py-2 rounded-lg shrink-0"
                            title={connectionState.detail}
                        >
                            <div className="flex items-center gap-2">
                                <ConnectionIcon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${connectionState.textClass}`} />
                                <span className={`text-xs md:text-sm font-semibold ${connectionState.textClass}`}>
                                    {connectionState.label}
                                </span>
                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${connectionState.dotClass}`} />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.header>

            <main className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-8 space-y-4 md:space-y-8">
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="professional-card rounded-xl p-4 md:p-6 border-l-4 border-brand-500"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-50 rounded-lg">
                                <Server className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">MQTT Broker</p>
                                <p className={`text-sm font-bold ${mqttConnected ? 'text-brand-700' : 'text-red-600'}`}>
                                    {mqttConnected ? 'Connected' : 'Disconnected'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <Activity className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">ESP32 Data</p>
                                <p className={`text-sm font-bold ${sensorFresh ? 'text-brand-700' : 'text-amber-600'}`}>
                                    {sensorFresh ? 'Receiving' : 'Waiting'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Cpu className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">ML Service</p>
                                <p className={`text-sm font-bold ${mlAvailable === false ? 'text-amber-600' : 'text-brand-700'}`}>
                                    {mlAvailable === false ? 'Fallback Active' : mlAvailable === true ? 'Online' : 'Waiting'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Activity className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Sensor Predictions</h2>
                            <p className="text-sm text-gray-600">Model output sent back to the ESP32 alert system</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SensorCard
                            icon={<Wind className="w-6 h-6" />}
                            title="MQ-135 (Air Quality)"
                            value={sensorData.mq135_ppm}
                            unit="ppm"
                            prediction={predictions.mq135}
                            type="mq135"
                        />
                        <SensorCard
                            icon={<Flame className="w-6 h-6" />}
                            title="MQ-2 (Smoke Detection)"
                            value={sensorData.mq2_ppm}
                            unit="ppm"
                            prediction={predictions.mq2}
                            type="mq2"
                        />
                        <SensorCard
                            icon={<Skull className="w-6 h-6" />}
                            title="MQ-7 (CO/Gas Detection)"
                            value={sensorData.mq7_ppm}
                            unit="ppm"
                            prediction={predictions.mq7}
                            type="mq7"
                        />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Thermometer className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Environmental Conditions</h2>
                            <p className="text-sm text-gray-600">Current lab environment status</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <EnvironmentCard
                            icon={<Thermometer className="w-5 h-5" />}
                            label="Temperature"
                            value={sensorData.temperature}
                            unit="deg C"
                            color="orange"
                        />
                        <EnvironmentCard
                            icon={<Droplets className="w-5 h-5" />}
                            label="Humidity"
                            value={sensorData.humidity}
                            unit="%"
                            color="blue"
                        />
                        <EnvironmentCard
                            icon={<Activity className="w-5 h-5" />}
                            label="Last Update"
                            value={sensorData.timestamp}
                            unit=""
                            color="green"
                        />
                    </div>
                </section>

                {history.length > 0 && (
                    <ChartSection history={history} />
                )}

                <footer className="pt-8 pb-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Leaf className="w-4 h-4 text-brand-500" />
                        <span>I-Chem Copyright 2026 - Powered by Net4think</span>
                        <Leaf className="w-4 h-4 text-brand-500" />
                    </div>
                </footer>
            </main>
        </div>
    )
}
