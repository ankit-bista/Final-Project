'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WalletConnector } from '@/components/wallet-connector'
import { Cloud, Lock, Share2, Shield, Zap } from 'lucide-react'

export function PublicLanding() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="SecureVault" className="h-7 w-7 object-contain" />
            <div className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-bold text-transparent">
              SecureVault
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WalletConnector />
            <Link href="/">
              <Button variant="outline">My Files</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-background via-card to-muted px-6 pb-16 pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary">
            Decentralized Cloud Storage
          </div>
          <h1 className="mb-6 text-balance bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
            Your Files, Your Wallet, Your Control
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Store files on IPFS, share by username, and anchor integrity proofs on blockchain.
          </p>
          <div className="mb-12 flex justify-center gap-3">
            <Link href="/">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Open My Files
              </Button>
            </Link>
            <Link href="/shared">
              <Button variant="outline">Open Shared</Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-secondary/15 p-12">
            <Cloud className="mx-auto mb-3 h-16 w-16 text-primary" />
            <p className="text-muted-foreground">Secure decentralized storage experience</p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-background to-muted/30 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, title: 'Web3 Security', text: 'Sign in with MetaMask and keep control in your wallet.' },
            { icon: Cloud, title: 'IPFS Storage', text: 'Content-addressed files, distributed and resilient.' },
            { icon: Share2, title: 'Share by Username', text: 'Share files with viewer/editor permissions.' },
            { icon: Shield, title: 'Tamper Proof', text: 'Anchor file metadata on-chain for verification.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary to-secondary px-6 py-16 text-center text-primary-foreground">
        <Zap className="mx-auto mb-3 h-8 w-8" />
        <h2 className="mb-2 text-3xl font-bold">Start building your decentralized drive</h2>
        <p className="mb-6 opacity-90">Connect your wallet and upload your first file.</p>
        <WalletConnector />
      </section>
    </div>
  )
}

