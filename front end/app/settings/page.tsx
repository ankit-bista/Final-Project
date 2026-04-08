'use client'

import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, User } from 'lucide-react'
import { useWeb3 } from '@/context/web3-context'
import { WalletConnectPrompt } from '@/components/wallet-connect-prompt'

export default function SettingsPage() {
  const { isConnected, account, disconnectWallet, username, error } = useWeb3()

  if (!isConnected) {
    return (
      <MainLayout title="Settings">
        <WalletConnectPrompt
          title="Sign in to open Settings"
          description="Connect your MetaMask wallet and sign a message — same as the home screen — to manage your account."
        />
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Settings">
      <BreadcrumbNav items={[{ label: 'Settings' }]} />

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Display name</label>
              <Input
                type="text"
                placeholder="Username"
                value={username?.trim() ? username : ''}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">
                {username?.trim()
                  ? 'Username from your profile'
                  : 'Set a username from the app when that flow is enabled'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Wallet Address</label>
              <Input type="text" placeholder="0x..." value={account ?? ''} disabled readOnly />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1 min-w-[120px]" onClick={disconnectWallet}>
                Disconnect
              </Button>
              <Button className="bg-primary hover:opacity-90 flex-1 min-w-[120px]" disabled>
                Save Changes
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Transaction notifications</label>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">File shared notifications</label>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <Button className="bg-primary hover:opacity-90" disabled>
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
