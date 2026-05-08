import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Web3Provider } from '@/context/web3-context'
import { UsernameModal } from '@/components/username-modal'


const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SecureVault - File Storage & Management',
  description: 'A modern cloud storage platform for managing files, folders, and users',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: '/icon.png',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Web3Provider>
          {children}
          <UsernameModal />
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  )
}
