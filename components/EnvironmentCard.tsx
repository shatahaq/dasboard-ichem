'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EnvironmentCardProps {
    icon: React.ReactNode
    label: string
    value: number | string
    unit: string
    color: 'orange' | 'blue' | 'green'
}

export default function EnvironmentCard({ icon, label, value, unit, color }: EnvironmentCardProps) {
    const colorClasses = {
        orange: {
            gradient: 'from-orange-500 to-amber-500',
            bg: 'bg-orange-50',
            iconBg: 'bg-orange-100',
            text: 'text-orange-600',
            border: 'border-orange-200'
        },
        blue: {
            gradient: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100',
            text: 'text-blue-600',
            border: 'border-blue-200'
        },
        green: {
            gradient: 'from-brand-500 to-emerald-500',
            bg: 'bg-brand-50',
            iconBg: 'bg-brand-100',
            text: 'text-brand-600',
            border: 'border-brand-200'
        }
    }

    const colors = colorClasses[color]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={cn(
                'professional-card rounded-xl p-6 relative overflow-hidden',
                'border-l-4',
                colors.border
            )}
        >
            <div className="flex items-center justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-lg', colors.iconBg)}>
                            <span className={colors.text}>
                                {icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700">{label}</p>
                            <p className="text-xs text-gray-500">Current reading</p>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 pl-1">
                        <motion.span
                            key={String(value)}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-gray-900"
                        >
                            {typeof value === 'number' ? value.toFixed(1) : value}
                        </motion.span>
                        {unit && <span className="text-lg text-gray-500 font-medium">{unit}</span>}
                    </div>
                </div>

                {/* Decorative circle */}
                <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    colors.bg
                )}>
                    <div className={cn(
                        'w-10 h-10 rounded-full bg-gradient-to-br',
                        colors.gradient,
                        'opacity-60'
                    )} />
                </div>
            </div>
        </motion.div>
    )
}