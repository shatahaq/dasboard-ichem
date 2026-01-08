'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface ChartSectionProps {
    history: any[]
}

export default function ChartSection({ history }: ChartSectionProps) {
    const chartData = history.map((item, index) => ({
        index,
        time: item.timestamp,
        MQ135: item.mq135_ppm,
        MQ2: item.mq2_ppm,
        MQ7: item.mq7_ppm,
        Temp: item.temperature,
        Humidity: item.humidity
    }))

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            <h2 className="text-2xl font-semibold text-white flex items-center">
                <TrendingUp className="mr-2 text-blue-400" />
                Trend Analysis
            </h2>

            {/* Gas Sensors Chart */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💨 Gas Sensors</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="index" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="MQ135" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="MQ2" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="MQ7" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Environment Chart */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🌡️ Environment</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="index" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Temp" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    )
}
