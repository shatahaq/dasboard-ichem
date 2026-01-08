'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Thermometer, Droplets, Wind, Flame, Skull, TrendingUp, Sparkles, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { io, Socket } from 'socket.io-client'

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

// Premium Sensor Card with Micro-interactions
function PremiumSensorCard({ icon, title, value, unit, prediction, type }: {
    icon: React.ReactNode
    title: string
    value: number
    unit: string
    prediction: Prediction
    type: string
}) {
    const [isHovered, setIsHovered] = useState(false)

    const getGradient = () => {
        if (type === 'mq135') {
            if (prediction.label === 'Baik') return 'from-emerald-400 to-teal-400'
            if (prediction.label === 'Sedang') return 'from-amber-400 to-orange-400'
            return 'from-rose-400 to-red-400'
        }
        if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
            return 'from-emerald-400 to-teal-400'
        }
        return 'from-rose-400 to-red-400'
    }

    const getBgGlow = () => {
        if (type === 'mq135') {
            if (prediction.label === 'Baik') return 'shadow-emerald-200'
            if (prediction.label === 'Sedang') return 'shadow-orange-200'
            return 'shadow-rose-200'
        }
        if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
            return 'shadow-emerald-200'
        }
        return 'shadow-rose-200'
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.02 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={`glass-premium rounded-3xl p-8 relative overflow-hidden ${getBgGlow()} shadow-2xl hover:shadow-3xl`}
        >
            {/* Animated Background Orb */}
            <motion.div
                className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${getGradient()} opacity-20 blur-3xl`}
                animate={{
                    scale: isHovered ? [1, 1.2, 1] : 1,
                    rotate: [0, 180, 360],
                }}
                transition={{
                    scale: { duration: 2, repeat: Infinity },
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' }
                }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <motion.div
                        className={`p-3 rounded-2xl bg-gradient-to-br ${getGradient()} shadow-lg`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="text-white">
                            {icon}
                        </div>
                    </motion.div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                        <p className="text-xs text-gray-500">Real-time AI</p>
                    </div>
                </div>
                {(prediction.label.includes('BAHAYA') || prediction.label.includes('BERBAHAYA')) && (
                    <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <Zap className="w-6 h-6 text-rose-500 fill-rose-500" />
                    </motion.div>
                )}
            </div>

            {/* Status Badge */}
            <div className="relative z-10 text-center mb-6">
                <motion.div
                    className={`inline-block px-6 py-3 rounded-2xl bg-gradient-to-r ${getGradient()} shadow-xl`}
                    whileHover={{ scale: 1.05 }}
                >
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        {prediction.label}
                    </h2>
                </motion.div>
                <motion.p
                    className="text-xs text-gray-600 mt-3 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Confidence: {prediction.confidence.toFixed(1)}%
                </motion.p>
            </div>

            {/* Value Display */}
            <div className="relative z-10 text-center mb-6">
                <div className="flex items-baseline justify-center space-x-2">
                    <motion.span
                        className="text-6xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent"
                        key={value}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        {value.toFixed(1)}
                    </motion.span>
                    <span className="text-2xl text-gray-500 font-medium">{unit}</span>
                </div>
            </div>

            {/* Animated Progress */}
            <div className="relative z-10">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                        className={`h-full bg-gradient-to-r ${getGradient()} relative overflow-hidden`}
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.confidence}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    >
                        <div className="shimmer absolute inset-0" />
                    </motion.div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>
        </motion.div>
    )
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
        const socket: Socket = io()

        socket.on('connect', () => {
            console.log('✅ Socket.io connected')
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            console.log('❌ Socket.io disconnected')
            setIsConnected(false)
        })

        socket.on('sensor_data', (data: any) => {
            const updatedData: SensorData = {
                temperature: data.temperature || 0,
                humidity: data.humidity || 0,
                mq135_ppm: data.mq135_ppm || 0,
                mq2_ppm: data.mq2_ppm || 0,
                mq7_ppm: data.mq7_ppm || 0,
                timestamp: new Date().toLocaleTimeString()
            }

            setSensorData(updatedData)
            setHistory(prev => [...prev.slice(-50), updatedData])
        })

        socket.on('predictions', (preds: Predictions) => {
            setPredictions(preds)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
            {/* Floating Orbs Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-cyan-600/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="max-w-7xl mx-auto space-y-10 relative z-10">
                {/* Premium Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                >
                    <motion.div
                        className="inline-block"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="flex items-center justify-center space-x-6">
                            <motion.img
                                src="/logo.jpg"
                                alt="I-Chem"
                                className="w-24 h-24 rounded-3xl shadow-2xl ring-4 ring-white/50"


                            />
                            <div className="text-left">
                                <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent mb-2">
                                    I-Chem
                                </h1>

                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="inline-flex items-center space-x-3 px-6 py-3 glass-premium rounded-full shadow-lg"
                        whileHover={{ scale: 1.05 }}
                    >
                        <Activity className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">Real-time Chemical Lab Safety Monitoring</span>
                        <AnimatePresence mode="wait">
                            {isConnected ? (
                                <motion.span
                                    key="connected"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="flex items-center text-emerald-600 font-medium"
                                >
                                    <motion.span
                                        className="w-2 h-2 bg-emerald-500 rounded-full mr-2"
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    Live
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="disconnected"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="flex items-center text-rose-600 font-medium"
                                >
                                    <span className="w-2 h-2 bg-rose-500 rounded-full mr-2" />
                                    Offline
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>

                {/* Sensor Cards */}
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-gray-800 mb-8 flex items-center"
                    >
                        <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-4" />
                        AI Sensor Predictions
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <PremiumSensorCard
                            icon={<Wind className="w-6 h-6" />}
                            title="MQ-135 (Air Quality)"
                            value={sensorData.mq135_ppm}
                            unit="ppm"
                            prediction={predictions.mq135}
                            type="mq135"
                        />
                        <PremiumSensorCard
                            icon={<Flame className="w-6 h-6" />}
                            title="MQ-2 (Smoke Detection)"
                            value={sensorData.mq2_ppm}
                            unit="ppm"
                            prediction={predictions.mq2}
                            type="mq2"
                        />
                        <PremiumSensorCard
                            icon={<Skull className="w-6 h-6" />}
                            title="MQ-7 (CO/Gas Detection)"
                            value={sensorData.mq7_ppm}
                            unit="ppm"
                            prediction={predictions.mq7}
                            type="mq7"
                        />
                    </div>
                </div>

                {/* Environment Section */}
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-gray-800 mb-8 flex items-center"
                    >
                        <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-pink-600 rounded-full mr-4" />
                        Environment
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <motion.div
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="glass-premium rounded-3xl p-8 text-center shadow-2xl shadow-orange-200 relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-full blur-2xl"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                            />
                            <Thermometer className="w-12 h-12 mx-auto text-orange-500 mb-4" />
                            <p className="text-sm text-gray-600 mb-3 font-medium">Temperature</p>
                            <p className="text-5xl font-bold bg-gradient-to-br from-orange-600 to-red-600 bg-clip-text text-transparent">
                                {sensorData.temperature.toFixed(1)}
                                <span className="text-2xl">°C</span>
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="glass-premium rounded-3xl p-8 text-center shadow-2xl shadow-blue-200 relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-cyan-500/30 rounded-full blur-2xl"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                            />
                            <Droplets className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                            <p className="text-sm text-gray-600 mb-3 font-medium">Humidity</p>
                            <p className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                {sensorData.humidity.toFixed(1)}
                                <span className="text-2xl">%</span>
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="glass-premium rounded-3xl p-8 text-center shadow-2xl shadow-purple-200 relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-full blur-2xl"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Activity className="w-12 h-12 mx-auto text-purple-500 mb-4" />
                            <p className="text-sm text-gray-600 mb-3 font-medium">Last Update</p>
                            <p className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {sensorData.timestamp}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Premium Charts */}
                {history.length > 5 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-premium rounded-3xl p-10 shadow-2xl"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
                            <div className="w-2 h-8 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full mr-4" />
                            <TrendingUp className="mr-3 text-cyan-600" />
                            Trend Analysis
                        </h2>
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center">
                                    <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                                    Gas Sensors (PPM)
                                </h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={history.slice(-30)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                                        <XAxis dataKey="timestamp" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                border: 'none',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Line type="monotone" dataKey="mq135_ppm" stroke="#06b6d4" strokeWidth={3} name="MQ-135" dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="mq2_ppm" stroke="#f59e0b" strokeWidth={3} name="MQ-2" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="mq7_ppm" stroke="#10b981" strokeWidth={3} name="MQ-7" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center">
                                    <Thermometer className="w-5 h-5 mr-2 text-orange-500" />
                                    Environment Conditions
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={history.slice(-30)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                                        <XAxis dataKey="timestamp" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                border: 'none',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={4} name="Temp (°C)" dot={{ r: 5, fill: '#f97316' }} activeDot={{ r: 7 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={4} name="Humidity (%)" dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                >
                    <p className="text-gray-500 text-sm">
                        Powered by • Net4think
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

