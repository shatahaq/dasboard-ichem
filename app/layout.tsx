import './globals.css'
import type { Metadata } from 'next'

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
        <html lang="id">
            <body>
                <main className="min-h-screen p-4 md:p-8">
                    {children}
                </main>
            </body>
        </html>
    )
}
