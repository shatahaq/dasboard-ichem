import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Lab Monitor AI - Real-time Chemical Lab Safety',
    description: 'Advanced air quality monitoring with ML predictions',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <main className="min-h-screen p-4 md:p-8">
                    {children}
                </main>
            </body>
        </html>
    )
}