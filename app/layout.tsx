import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'Inktober 2026 · Bhaumik Mistry',
  description: 'Thirty one ink drawings, one a day through October 2026.',
  metadataBase: new URL('https://inktober.bhaumikmistry.com'),
  openGraph: { title: 'Inktober 2026', description: 'One ink drawing a day through October.', url: '/' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
