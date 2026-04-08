'use client'

import { FileItem } from '@/lib/mock-data'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlockchainBadge, IPFSBadge, OwnerBadge } from '@/components/blockchain-badge'
import { Copy, ExternalLink } from 'lucide-react'

interface FileBlockchainInfoProps {
  file: FileItem
}

export function FileBlockchainInfo({ file }: FileBlockchainInfoProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-muted to-accent/15 border-border">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-3">Blockchain Details</h3>
        </div>

        {/* Blockchain Status */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Status</p>
          <BlockchainBadge
            isOnBlockchain={file.isOnBlockchain}
            verified={file.verified}
            size="md"
            showLabel={true}
          />
        </div>

        {/* Owner Address */}
        {file.ownerAddress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Owner Address</p>
            <div className="flex items-center gap-2 bg-card p-3 rounded-md border border-border">
              <span className="font-mono text-sm text-foreground flex-1">{file.ownerAddress}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(file.ownerAddress || '')}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* IPFS Hash */}
        {file.ipfsHash && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">IPFS Hash</p>
            <div className="flex items-center gap-2 bg-card p-3 rounded-md border border-border">
              <div className="flex items-center gap-2 flex-1">
                <span className="font-mono text-sm text-foreground break-all">
                  {file.ipfsHash}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(file.ipfsHash || '')}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <a
                href={`https://ipfs.io/ipfs/${file.ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {file.txHash && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Transaction Hash</p>
            <div className="flex items-center gap-2 bg-card p-3 rounded-md border border-border">
              <span className="font-mono text-sm text-foreground flex-1 break-all">
                {file.txHash}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(file.txHash || '')}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload to Blockchain Button */}
        {!file.isOnBlockchain && (
          <Button className="w-full gap-2 bg-primary hover:opacity-90">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            Upload to Blockchain
          </Button>
        )}

        {/* IPFS Upload Button */}
        {!file.ipfsHash && (
          <Button variant="outline" className="w-full gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            Upload to IPFS
          </Button>
        )}
      </div>
    </Card>
  )
}
