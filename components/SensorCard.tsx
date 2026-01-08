'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SensorCardProps {
    icon: React.ReactNode
    title: string
    value: number
    unit: string
    prediction: {
        label: string
        confidence: number
    }
    type: 'mq135' | 'mq2' | 'mq7'
}

export default function SensorCard({ icon, title, value, unit, prediction, type }: SensorCardProps) {
    // Determine color based on prediction
    const getColor = () => {
        if (type === 'mq135') {
            if (prediction.label === 'Baik') return { gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10' }
            if (prediction.label === 'Sedang') return { gradient: 'from-yellow-500 to-orange-600', bg: 'bg-yellow-500/10' }
            return { gradient: 'from-red-500 to-pink-600', bg: 'bg-red-500/10' }
        }

        // MQ2 and MQ7
        if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
            return { gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10' }
        }
        return { gradient: 'from-red-500 to-pink-600', bg: 'bg-red-500/10' }
    }

    const colors = getColor()
    const isDanger = prediction.label.includes('BAHAYA') || prediction.label.includes('BERBAHAYA')

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
                'glass rounded-2xl p-6 space-y-4 relative overflow-hidden',
                colors.bg
            )}
        >
            {/* Animated background gradient */}
            <motion.div
                className={cn('absolute inset-0 bg-gradient-to-br opacity-10', colors.gradient)}
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />

            {/* Content */}
            <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-300">
                        {icon}
                        <span className="text-sm font-medium">{title}</span>
                    </div>
                    {isDanger && (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-3 h-3 rounded-full bg-red-500"
                        />
                    )}
                </div>

                {/* Status */}
                <div className="text-center">
                    <motion.h3
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={cn(
                            'text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
                            colors.gradient
                        )}
                    >
                        {prediction.label}
                    </motion.h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Confidence: {prediction.confidence.toFixed(1)}%
                    </p>
                </div>

                {/* Value */}
                <div className="flex items-baseline justify-center space-x-2">
                    <span className="text-4xl font-bold text-white">
                        {value.toFixed(1)}
                    </span>
                    <span className="text-xl text-gray-400">{unit}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className={cn('h-full bg-gradient-to-r', colors.gradient)}
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.confidence}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </motion.div>
    )
}
