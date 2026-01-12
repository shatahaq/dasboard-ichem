'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Thermometer, Droplets, Wind, Flame, Skull, Leaf, Wifi, WifiOff } from 'lucide-react'
import SensorCard from '@/components/SensorCard'
import EnvironmentCard from '@/components/EnvironmentCard'
import ChartSection from '@/components/ChartSection'
import { io, Socket } from 'socket.io-client' // Added back for Proxy mode
// import mqtt from 'mqtt' // Removed unused direct MQTT
import Image from 'next/image'

interface SensorData {
    temperature: number
    humidity: number
    mq135_ppm: number
    mq2_ppm: number
    mq7_ppm: number
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

export default function Dashboard() {
    const [sensorData, setSensorData] = useState<SensorData>({
        temperature: 0,
        humidity: 0,
        mq135_ppm: 0,
        mq2_ppm: 0,
        mq7_ppm: 0,
        timestamp: '-'
    })

    const [predictions, setPredictions] = useState<Predictions>({
        mq135: { label: 'Menunggu...', confidence: 0 },
        mq2: { label: 'AMAN', confidence: 0 },
        mq7: { label: 'NORMAL', confidence: 0 }
    })

    const [history, setHistory] = useState<any[]>([])
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        // Fallback: Use Socket.io (Proxy) because direct MQTT (WSS) is blocked in this environment
        const socket: Socket = io()

        socket.on('connect', () => {
            console.log('✅ Socket.io connected (Proxy Mode)')
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            console.log('❌ Socket.io disconnected')
            setIsConnected(false)
        })

        socket.on('sensor_data', (data: any) => {
            console.log('📡 Received ESP32 data (via Proxy):', data)

            const updatedData: SensorData = {
                temperature: Number(data.temperature) || 0,
                humidity: Number(data.humidity) || 0,
                mq135_ppm: Number(data.mq135_ppm) || 0,
                mq2_ppm: Number(data.mq2_ppm) || 0,
                mq7_ppm: Number(data.mq7_ppm) || 0,
                timestamp: new Date().toLocaleTimeString()
            }

            setSensorData(updatedData)
            setHistory(prev => [...prev.slice(-50), updatedData])
        })

        socket.on('predictions', (preds: Predictions) => {
            console.log('🤖 ML Predictions received:', preds)
            setPredictions(preds)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div className="min-h-screen">
            {/* Professional Header */}
            <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="professional-header sticky top-0 z-50 backdrop-blur-sm bg-white/95"
            >
                <div className="max-w-7xl mx-auto px-4 py-3 md:px-8 md:py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-3 md:gap-4">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="relative"
                            >
                                <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl overflow-hidden bg-white border-2 border-brand-500 logo-glow">
                                    <Image
                                        src="/logo.jpg"
                                        alt="IC Lab Monitor"
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover"
                                        priority
                                    />
                                </div>
                            </motion.div>

                            <div>
                                <h1 className="text-lg md:text-3xl font-bold text-green-gradient leading-tight">
                                    I-Chem
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600 font-medium hidden md:block">
                                    AI-Powered Environmental Monitoring
                                </p>
                            </div>
                        </div>

                        {/* Connection Status */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="status-badge px-3 py-1.5 md:px-4 md:py-2 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-3 h-3 md:w-4 md:h-4 text-brand-500" />
                                        <span className="text-xs md:text-sm font-semibold text-brand-600">Connected</span>
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-500 animate-pulse"></div>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-4 h-4 text-red-500" />
                                        <span className="text-sm font-semibold text-red-600">Disconnected</span>
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-8 space-y-4 md:space-y-8">
                {/* Info Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="professional-card rounded-xl p-4 md:p-6 border-l-4 border-brand-500"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Activity className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1">Real-time Monitoring Active</h3>
                            <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                                Monitoring air quality with 3 ML-powered sensors for chemical lab safety
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Sensor Predictions */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Activity className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Sensor Predictions</h2>
                            <p className="text-sm text-gray-600">AI-powered air quality analysis</p>
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

                {/* Environment */}
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
                            unit="°C"
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

                {/* Charts */}
                {history.length > 0 && (
                    <ChartSection history={history} />
                )}

                {/* Footer */}
                <footer className="pt-8 pb-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Leaf className="w-4 h-4 text-brand-500" />
                        <span>I-Chem © 2026 - Powered by Net4think</span>
                        <Leaf className="w-4 h-4 text-brand-500" />
                    </div>
                </footer>
            </main>
        </div>
    )
}