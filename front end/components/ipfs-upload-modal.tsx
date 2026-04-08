'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileItem } from '@/lib/mock-data'
import { Upload, CheckCircle2, Clock } from 'lucide-react'
import { useWeb3 } from '@/context/web3-context'

interface IPFSUploadModalProps {
  isOpen: boolean
  onClose: () => void
  file?: FileItem
}

export function IPFSUploadModal({ isOpen, onClose, file }: IPFSUploadModalProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle')
  const [ipfsHash, setIpfsHash] = useState<string | null>(null)
  const { isConnected, account } = useWeb3()

  const handleUploadToIPFS = async () => {
    if (!file) return

    setUploadStatus('uploading')

    // Simulate IPFS upload
    setTimeout(() => {
      const mockHash = `QmXx${Math.random().toString(36).substring(7)}Xx`
      setIpfsHash(mockHash)
      setUploadStatus('success')
    }, 2000)
  }

  const handleUploadToBlockchain = async () => {
    if (!isConnected || !account) {
      alert('Please connect your wallet first')
      return
    }

    // This would trigger MetaMask for smart contract interaction
    console.log('[v0] Uploading to blockchain with account:', account)
    alert('Smart contract interaction would be triggered here')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload to IPFS & Blockchain</DialogTitle>
          <DialogDescription>
            Store your file on decentralized networks for maximum security and availability
          </DialogDescription>
        </DialogHeader>

        {file && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click below to upload this file to IPFS and register ownership on blockchain
              </p>
            </div>

            {/* IPFS Upload */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Step 1: Upload to IPFS</h4>
              {uploadStatus === 'idle' && (
                <Button
                  onClick={handleUploadToIPFS}
                  className="w-full gap-2 bg-accent hover:opacity-90"
                >
                  <Upload className="w-4 h-4" />
                  Upload to IPFS
                </Button>
              )}

              {uploadStatus === 'uploading' && (
                <div className="p-3 bg-accent/15 rounded-lg border border-accent/20 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-sm text-accent">Uploading to IPFS...</span>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="p-3 bg-secondary/15 rounded-lg border border-secondary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-secondary font-medium">IPFS Upload Complete</span>
                  </div>
                  {ipfsHash && (
                    <div className="bg-card p-2 rounded border border-secondary/20">
                      <p className="text-xs font-mono text-foreground break-all">{ipfsHash}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blockchain Registration */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Step 2: Register on Blockchain</h4>
              <p className="text-xs text-muted-foreground">
                Requires MetaMask wallet connection to register file ownership
              </p>
              <Button
                onClick={handleUploadToBlockchain}
                disabled={!isConnected || uploadStatus === 'idle'}
                className="w-full gap-2 bg-primary hover:opacity-90"
              >
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Register on Blockchain
              </Button>
            </div>

            {!isConnected && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">
                  Please connect your MetaMask wallet to register the file on blockchain
                </p>
              </div>
            )}

            {/* Close Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
