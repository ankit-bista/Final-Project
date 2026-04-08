'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWeb3 } from '@/context/web3-context'
import { Wallet, Shield, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export function BlockchainSettings() {
  const { isConnected, account, balance, connectWallet } = useWeb3()
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum-mainnet')
  const [status, setStatus] = useState<any>(null)
  const [quota, setQuota] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const networks = [
    { id: 'ethereum-mainnet', name: 'Ethereum Mainnet', chainId: 1 },
    { id: 'ethereum-sepolia', name: 'Ethereum Sepolia (Testnet)', chainId: 11155111 },
    { id: 'polygon', name: 'Polygon', chainId: 137 },
    { id: 'arbitrum', name: 'Arbitrum One', chainId: 42161 },
  ]

  useEffect(() => {
    const run = async () => {
      if (!isConnected) {
        setStatus(null)
        setQuota(null)
        return
      }
      setLoading(true)
      try {
        const [s, q] = await Promise.all([
          api.get('/blockchain/status'),
          api.get('/blockchain/quota'),
        ])
        setStatus(s.data)
        setQuota(q.data)
      } catch (e) {
        setStatus(null)
        setQuota(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [isConnected])

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Wallet Connection</h3>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-secondary/15 rounded-lg border border-secondary/20">
              <p className="text-sm text-secondary mb-2">Connected</p>
              <div className="flex items-center gap-2 bg-card p-3 rounded border border-secondary/20">
                <span className="font-mono text-sm text-foreground">{account}</span>
                <span className="ml-auto font-semibold text-secondary">{balance} ETH</span>
              </div>
            </div>
            <Button variant="destructive" className="w-full">
              Disconnect Wallet
            </Button>
          </div>
        ) : (
          <Button onClick={connectWallet} className="w-full gap-2 bg-primary hover:opacity-90">
            <Wallet className="w-4 h-4" />
            Connect MetaMask Wallet
          </Button>
        )}
      </Card>

      {/* Network Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-lg">Network Configuration</h3>
        </div>

        <div className="space-y-3">
          {networks.map((network) => (
            <label
              key={network.id}
              className="flex items-center p-3 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="network"
                value={network.id}
                checked={selectedNetwork === network.id}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-4 h-4"
              />
              <div className="ml-3 flex-1">
                <p className="font-medium text-sm">{network.name}</p>
                <p className="text-xs text-muted-foreground">Chain ID: {network.chainId}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Smart Contract Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-lg">Smart Contract</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Contract Address</label>
            <Input
              placeholder="0x..."
              className="mt-2"
              value={status?.driveV2Contract || ''}
              readOnly
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded border border-border bg-muted/30">
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="text-sm font-medium">{status ? (status.useRealContracts ? 'Real (Sepolia)' : 'Mock') : '—'}</div>
            </div>
            <div className="p-3 rounded border border-border bg-muted/30">
              <div className="text-xs text-muted-foreground">Wallet</div>
              <div className="text-sm font-mono truncate">{quota?.walletAddress || account || '—'}</div>
            </div>
          </div>

          <div className="p-3 rounded border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Quota</div>
            <div className="text-sm">
              {quota?.mode === 'real'
                ? `${quota.usedBytes} / ${quota.quotaLimitBytes} bytes (${quota.usagePercent}%)`
                : quota?.mode === 'mock'
                  ? 'Mock mode (no on-chain quota)'
                  : '—'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">ABI/Function</label>
            <select className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground">
              <option>registerFileOwnership(bytes32, address)</option>
              <option>verifyFileHash(bytes32)</option>
              <option>transferFileOwnership(bytes32, address)</option>
              <option>revokeFileAccess(bytes32, address)</option>
            </select>
          </div>

          <Button className="w-full gap-2 bg-accent hover:opacity-90" disabled>
            <Shield className="w-4 h-4" />
            {loading ? 'Loading...' : 'Configured via .env'}
          </Button>
        </div>
      </Card>

      {/* IPFS Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">IPFS Gateway Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">IPFS Gateway URL</label>
            <Input
              placeholder="https://gateway.ipfs.io"
              className="mt-2"
              defaultValue="https://gateway.ipfs.io"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Pinning Service</label>
            <select className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground">
              <option>Pinata</option>
              <option>NFT.Storage</option>
              <option>Web3.Storage</option>
              <option>Lighthouse</option>
            </select>
          </div>

          <Button variant="outline" className="w-full">
            Test Connection
          </Button>
        </div>
      </Card>

      {/* File Storage Policy */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">File Storage Policy</h3>

        <div className="space-y-3">
          <label className="flex items-center p-3 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <input type="radio" name="policy" defaultChecked className="w-4 h-4" />
            <div className="ml-3 flex-1">
              <p className="font-medium text-sm">Always encrypt before uploading</p>
              <p className="text-xs text-muted-foreground">Files are encrypted with your wallet key</p>
            </div>
          </label>

          <label className="flex items-center p-3 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <input type="radio" name="policy" className="w-4 h-4" />
            <div className="ml-3 flex-1">
              <p className="font-medium text-sm">Public storage</p>
              <p className="text-xs text-muted-foreground">Files are stored without encryption</p>
            </div>
          </label>

          <label className="flex items-center p-3 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <input type="radio" name="policy" className="w-4 h-4" />
            <div className="ml-3 flex-1">
              <p className="font-medium text-sm">Auto-replicate on multiple nodes</p>
              <p className="text-xs text-muted-foreground">Ensures high availability across IPFS network</p>
            </div>
          </label>
        </div>
      </Card>

      {/* Save Configuration */}
      <Button className="w-full gap-2 bg-primary hover:opacity-90">
        Save Blockchain Configuration
      </Button>
    </div>
  )
}
