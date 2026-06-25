'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WalletConnector } from '@/components/wallet-connector'
import { useWeb3 } from '@/context/web3-context'
import { Cloud, Lock, Share2, Shield, Upload, Download, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Lock,
    title: 'Wallet Sign-In',
    text: 'Authenticate with MetaMask — no passwords stored on our servers.',
  },
  {
    icon: Cloud,
    title: 'IPFS Storage',
    text: 'Files are content-addressed and stored on your IPFS node.',
  },
  {
    icon: Share2,
    title: 'Share Securely',
    text: 'Share files by username with viewer or editor permissions.',
  },
  {
    icon: Shield,
    title: 'On-Chain Proofs',
    text: 'Optional blockchain anchoring for file integrity verification.',
  },
]

export function PublicLanding() {
  const { isConnected } = useWeb3()

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/icon.png" alt="SecureVault" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight text-foreground">SecureVault</span>
          </Link>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Link href="/drive">
                <Button className="gap-2">
                  Open My Drive
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <WalletConnector redirectTo="/drive" />
            )}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-20 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Decentralized storage · IPFS · Web3
          </div>
          <h1 className="mb-5 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Your files. Your wallet. Your control.
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Upload, share, and download files on IPFS with wallet-based authentication.
            Encrypted in the browser before upload when you choose to encrypt.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isConnected ? (
              <Link href="/drive">
                <Button size="lg" className="gap-2 px-8">
                  Go to My Drive
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <WalletConnector redirectTo="/drive" variant="hero" />
            )}
            <Link href="/shared">
              <Button size="lg" variant="outline" className="px-8">
                Shared With Me
              </Button>
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Upload, label: 'Upload to IPFS' },
              { icon: Share2, label: 'Share by username' },
              { icon: Download, label: 'Download anytime' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/20 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/80 px-8 py-12 text-center text-primary-foreground shadow-lg">
          <h2 className="mb-3 text-2xl font-bold md:text-3xl">Ready to get started?</h2>
          <p className="mb-8 opacity-90">Connect MetaMask and upload your first file in under a minute.</p>
          <div className="flex justify-center">
            {isConnected ? (
              <Link href="/drive">
                <Button size="lg" variant="secondary" className="gap-2">
                  Open My Drive
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <WalletConnector redirectTo="/drive" variant="hero" />
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        SecureVault · IPFS-backed decentralized drive
      </footer>
    </div>
  )
}
