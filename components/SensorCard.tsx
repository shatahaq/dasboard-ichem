'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

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
    const getColor = () => {
        if (type === 'mq135') {
            if (prediction.label === 'Baik') return {
                gradient: 'from-brand-500 to-brand-600',
                bg: 'bg-brand-50',
                border: 'border-brand-200',
                text: 'text-brand-700',
                icon: CheckCircle,
                iconColor: 'text-brand-500'
            }
            if (prediction.label === 'Sedang') return {
                gradient: 'from-amber-500 to-orange-500',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-700',
                icon: AlertTriangle,
                iconColor: 'text-amber-500'
            }
            return {
                gradient: 'from-red-500 to-rose-600',
                bg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                icon: AlertCircle,
                iconColor: 'text-red-500'
            }
        }

        // MQ-2 (Smoke Detection)
        if (type === 'mq2') {
            if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
                return {
                    gradient: 'from-brand-500 to-brand-600',
                    bg: 'bg-brand-50',
                    border: 'border-brand-200',
                    text: 'text-brand-700',
                    icon: CheckCircle,
                    iconColor: 'text-brand-500'
                }
            }
            return {
                gradient: 'from-red-600 to-rose-700',
                bg: 'bg-red-50',
                border: 'border-red-300',
                text: 'text-red-700',
                icon: AlertCircle,
                iconColor: 'text-red-600'
            }
        }

        // MQ-7 (CO/Gas Detection)
        if (type === 'mq7') {
            if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
                return {
                    gradient: 'from-brand-500 to-brand-600',
                    bg: 'bg-brand-50',
                    border: 'border-brand-200',
                    text: 'text-brand-700',
                    icon: CheckCircle,
                    iconColor: 'text-brand-500'
                }
            }
            return {
                gradient: 'from-violet-600 to-fuchsia-700',
                bg: 'bg-violet-50',
                border: 'border-violet-300',
                text: 'text-violet-700',
                icon: AlertCircle,
                iconColor: 'text-violet-600'
            }
        }

        // Default fallback
        if (prediction.label.includes('AMAN') || prediction.label.includes('NORMAL')) {
            return {
                gradient: 'from-brand-500 to-brand-600',
                bg: 'bg-brand-50',
                border: 'border-brand-200',
                text: 'text-brand-700',
                icon: CheckCircle,
                iconColor: 'text-brand-500'
            }
        }
        return {
            gradient: 'from-red-500 to-rose-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: AlertCircle,
            iconColor: 'text-red-500'
        }
    }

    const colors = getColor()
    const StatusIcon = colors.icon
    const isDanger = prediction.label.includes('BAHAYA') || prediction.label.includes('BERBAHAYA')

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={cn(
                'professional-card rounded-xl p-6 space-y-4 relative overflow-hidden',
                'border-l-4',
                colors.border
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-lg', colors.bg)}>
                        <span className={colors.iconColor}>
                            {icon}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                        <p className="text-xs text-gray-500">Real-time monitoring</p>
                    </div>
                </div>
                {isDanger && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
                    />
                )}
            </div>

            {/* Status Badge */}
            <div className={cn('rounded-lg p-4 text-center', colors.bg)}>
                <div className="flex items-center justify-center gap-2 mb-2">
                    <StatusIcon className={cn('w-5 h-5', colors.iconColor)} />
                    <motion.h3
                        key={prediction.label}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn('text-2xl font-bold', colors.text)}
                    >
                        {prediction.label}
                    </motion.h3>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                    Confidence: {prediction.confidence.toFixed(1)}%
                </p>
            </div>

            {/* Value Display */}
            <div className="flex items-baseline justify-center gap-2 py-2">
                <motion.span
                    key={value}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold text-gray-900"
                >
                    {value.toFixed(1)}
                </motion.span>
                <span className="text-xl text-gray-500 font-medium">{unit}</span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                    <span>Confidence Level</span>
                    <span className="font-semibold">{prediction.confidence.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className={cn('h-full bg-gradient-to-r rounded-full', colors.gradient)}
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.confidence}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
            </div>
        </motion.div>
    )
}