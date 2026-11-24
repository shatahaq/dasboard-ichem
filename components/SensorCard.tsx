'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

type SensorType = 'mq135' | 'mq2' | 'mq7'
type Severity = 'waiting' | 'safe' | 'warning' | 'danger' | 'unknown'

interface SensorCardProps {
    icon: React.ReactNode
    title: string
    value: number | null
    unit: string
    prediction: {
        label: string
        confidence: number
    }
    type: SensorType
}

function getSeverity(type: SensorType, label: string): Severity {
    const normalized = label
        .trim()
        .toUpperCase()
        .replace(/[_-]+/g, ' ')

    if (!normalized || normalized.includes('MENUNGGU') || normalized.includes('UNKNOWN')) {
        return 'waiting'
    }

    if (type === 'mq135') {
        if (normalized === 'BAIK') return 'safe'
        if (normalized === 'SEDANG') return 'warning'
        if (normalized.includes('TIDAK SEHAT') || normalized.includes('BAHAYA')) return 'danger'
        return 'unknown'
    }

    if (type === 'mq2') {
        if (normalized.includes('AMAN') || normalized.includes('NORMAL') || normalized.includes('NO SMOKE')) return 'safe'
        if (normalized.includes('BAHAYA') || normalized === 'SMOKE') return 'danger'
        return 'unknown'
    }

    if (normalized.includes('AMAN') || normalized.includes('NORMAL') || normalized.includes('NO SMOKE') || normalized.includes('NO GAS')) return 'safe'
    if (normalized.includes('BAHAYA') || ['SMOKE', 'GAS', 'CO'].includes(normalized)) return 'danger'
    return 'unknown'
}

function getColor(severity: Severity) {
    if (severity === 'safe') {
        return {
            gradient: 'from-brand-500 to-brand-600',
            bg: 'bg-brand-50',
            border: 'border-brand-200',
            text: 'text-brand-700',
            icon: CheckCircle,
            iconColor: 'text-brand-500'
        }
    }

    if (severity === 'warning') {
        return {
            gradient: 'from-amber-500 to-orange-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: AlertTriangle,
            iconColor: 'text-amber-500'
        }
    }

    if (severity === 'danger') {
        return {
            gradient: 'from-red-500 to-rose-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: AlertCircle,
            iconColor: 'text-red-500'
        }
    }

    return {
        gradient: 'from-slate-400 to-slate-500',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        icon: Clock,
        iconColor: 'text-slate-500'
    }
}

function formatValue(value: number | null) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '-'
}

export default function SensorCard({ icon, title, value, unit, prediction, type }: SensorCardProps) {
    const severity = getSeverity(type, prediction.label)
    const colors = getColor(severity)
    const StatusIcon = colors.icon
    const confidence = Number.isFinite(prediction.confidence)
        ? Math.max(0, Math.min(100, prediction.confidence))
        : 0
    const displayLabel = prediction.label.replace(/_/g, ' ')
    const isDanger = severity === 'danger'
    const hasPrediction = severity !== 'waiting' && severity !== 'unknown'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={cn(
                'professional-card rounded-xl p-6 space-y-4 relative overflow-hidden',
                'border-l-4',
                colors.border
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('p-2.5 rounded-lg shrink-0', colors.bg)}>
                        <span className={colors.iconColor}>
                            {icon}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-700 leading-snug">{title}</h3>
                        <p className="text-xs text-gray-500">Real-time monitoring</p>
                    </div>
                </div>
                {isDanger && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 shrink-0"
                    />
                )}
            </div>

            <div className={cn('rounded-lg p-4 text-center', colors.bg)}>
                <div className="flex items-center justify-center gap-2 mb-2">
                    <StatusIcon className={cn('w-5 h-5 shrink-0', colors.iconColor)} />
                    <motion.h3
                        key={prediction.label}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn('text-2xl font-bold leading-tight break-words', colors.text)}
                    >
                        {displayLabel}
                    </motion.h3>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                    {hasPrediction ? `Confidence: ${confidence.toFixed(1)}%` : 'Confidence: -'}
                </p>
            </div>

            <div className="flex items-baseline justify-center gap-2 py-2">
                <motion.span
                    key={String(value)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold text-gray-900"
                >
                    {formatValue(value)}
                </motion.span>
                <span className="text-xl text-gray-500 font-medium">{unit}</span>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                    <span>Confidence Level</span>
                    <span className="font-semibold">{hasPrediction ? `${confidence.toFixed(0)}%` : '-'}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className={cn('h-full bg-gradient-to-r rounded-full', colors.gradient)}
                        initial={{ width: 0 }}
                        animate={{ width: hasPrediction ? `${confidence}%` : '0%' }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>
        </motion.div>
    )
}
