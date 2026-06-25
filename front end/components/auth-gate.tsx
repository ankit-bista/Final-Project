'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3 } from '@/context/web3-context'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const { isConnected, isSessionReady } = useWeb3()
  const router = useRouter()

  useEffect(() => {
    if (isSessionReady && !isConnected) {
      router.replace('/')
    }
  }, [isConnected, isSessionReady, router])

  if (!isSessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting to sign in...
      </div>
    )
  }

  return <>{children}</>
}
