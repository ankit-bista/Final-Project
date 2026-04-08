'use client'

import { useWeb3 } from '@/context/web3-context'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function WalletConnector() {
  const router = useRouter()
  const { isConnected, account, balance, connectWallet, disconnectWallet, isConnecting, error } = useWeb3()

  const truncateAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="gap-2 bg-primary hover:opacity-90"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
          <Wallet className="w-4 h-4" />
          <div className="flex flex-col items-start text-xs">
            <span className="font-semibold">{truncateAddress(account || '')}</span>
            <span className="text-xs text-muted-foreground">{balance} ETH</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Connected Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-sm">
          <p className="font-mono text-xs break-all text-muted-foreground mb-2">{account}</p>
          <p className="text-sm font-semibold">Balance: {balance} ETH</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await disconnectWallet()
            router.push('/landing')
          }}
          className="text-destructive focus:text-destructive"
        >
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
