'use client'

import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeb3 } from '@/context/web3-context'

type Props = {
  title?: string
  description?: string
}

export function WalletConnectPrompt({
  title = 'Connect your wallet',
  description = 'Connect your MetaMask wallet and sign a message to use this app.',
}: Props) {
  const { connectWallet, isConnecting, error } = useWeb3()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] space-y-4 px-6">
      <Wallet className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground max-w-sm text-center">{description}</p>
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="mt-4 bg-primary hover:opacity-90"
      >
        {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
      </Button>
      {error ? <p className="text-sm text-destructive max-w-md text-center">{error}</p> : null}
    </div>
  )
}
