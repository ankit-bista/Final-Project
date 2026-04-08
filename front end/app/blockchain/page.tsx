'use client'

import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { BlockchainSettings } from '@/components/blockchain-settings'

export default function BlockchainPage() {
  return (
    <MainLayout title="Blockchain Settings">
      <BreadcrumbNav items={[{ label: 'Blockchain Settings' }]} />

      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Configure your blockchain and IPFS settings for decentralized file storage and smart contract interactions.
          </p>
        </div>

        <BlockchainSettings />
      </div>
    </MainLayout>
  )
}
