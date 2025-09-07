import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QRush Trivia - Interactive WhatsApp Trivia Games',
  description: 'Engage your audience with fun, interactive trivia games delivered directly through WhatsApp. Perfect for businesses, events, and community building.',
  keywords: 'WhatsApp trivia, interactive games, business engagement, community building, trivia questions',
  authors: [{ name: 'QRush Trivia' }],
  openGraph: {
    title: 'QRush Trivia - Interactive WhatsApp Trivia Games',
    description: 'Engage your audience with fun, interactive trivia games delivered directly through WhatsApp.',
    type: 'website',
    locale: 'en_US',
    siteName: 'QRush Trivia',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://qrushtrivia.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
