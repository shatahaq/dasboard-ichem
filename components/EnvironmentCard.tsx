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
        orange: 'from-orange-500 to-red-600 bg-orange-500/10',
        blue: 'from-blue-500 to-cyan-600 bg-blue-500/10',
        green: 'from-green-500 to-teal-600 bg-green-500/10'
    }

    const [gradient, bg] = colorClasses[color].split(' ')

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('glass rounded-xl p-6 relative overflow-hidden', bg)}
        >
            <motion.div
                className={cn('absolute inset-0 bg-gradient-to-br opacity-5', gradient)}
                animate={{ opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-400">
                        {icon}
                        <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-white">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                        </span>
                        {unit && <span className="text-lg text-gray-400">{unit}</span>}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
