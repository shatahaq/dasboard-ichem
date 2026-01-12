'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, BarChart3 } from 'lucide-react'

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

    const tooltipStyle = {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '12px'
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Trend Analysis</h2>
                    <p className="text-sm text-gray-600">Historical data visualization</p>
                </div>
            </div>

            {/* Gas Sensors Chart */}
            <motion.div
                className="professional-card rounded-xl p-6"
                whileHover={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)' }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-brand-50 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Gas Sensors</h3>
                        <p className="text-sm text-gray-600">MQ-135, MQ-2, MQ-7 readings over time</p>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="index"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Line
                            type="monotone"
                            dataKey="MQ135"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            dot={false}
                            name="MQ-135 (Air Quality)"
                        />
                        <Line
                            type="monotone"
                            dataKey="MQ2"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={false}
                            name="MQ-2 (Smoke)"
                        />
                        <Line
                            type="monotone"
                            dataKey="MQ7"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            dot={false}
                            name="MQ-7 (CO/Gas)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Environment Chart */}
            <motion.div
                className="professional-card rounded-xl p-6"
                whileHover={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)' }}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Environment</h3>
                        <p className="text-sm text-gray-600">Temperature and humidity trends</p>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="index"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Line
                            type="monotone"
                            dataKey="Temp"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={false}
                            name="Temperature (°C)"
                        />
                        <Line
                            type="monotone"
                            dataKey="Humidity"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={false}
                            name="Humidity (%)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>
        </motion.section>
    )
}