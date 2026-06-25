'use client'

import { Search, User, LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { WalletConnector } from '@/components/wallet-connector'
import { useWeb3 } from '@/context/web3-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  title?: string
  onSearch?: (query: string) => void
}

export function Header({ title = 'My Files', onSearch }: HeaderProps) {
  const { isConnected, account, username, disconnectWallet } = useWeb3()
  const router = useRouter()

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4 flex-1 max-w-md mx-6 min-h-10">
        {isConnected && onSearch ? (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-10 bg-muted border-border"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        ) : (
          <div className="w-full" aria-hidden />
        )}
      </div>

      <div className="flex items-center gap-3">
        <WalletConnector redirectTo="/drive" />

        {isConnected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted rounded-full">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  <User className="w-4 h-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold text-sm">{username || 'Connected'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{shortAddress}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await disconnectWallet()
                  router.push('/')
                }}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
