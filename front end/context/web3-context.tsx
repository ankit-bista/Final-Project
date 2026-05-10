'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { BrowserProvider } from 'ethers'
import api from '../lib/api'
import { getMyEncryptionPublicKey } from '@/lib/file-crypto'

interface Web3ContextType {
  isConnected: boolean
  account: string | null
  chainId: number | null
  balance: string | null
  username: string | null
  role: 'admin' | 'commenter' | 'uploader' | null
  quotaBytes: number
  usedBytes: number
  remainingBytes: number
  needsUsername: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  saveUsername: (username: string) => Promise<void>
  isConnecting: boolean
  error: string | null
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'commenter' | 'uploader' | null>(null)
  const [quotaBytes, setQuotaBytes] = useState(0)
  const [usedBytes, setUsedBytes] = useState(0)
  const [remainingBytes, setRemainingBytes] = useState(0)
  const [needsUsername, setNeedsUsername] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasMetaMask = () =>
    typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined'

  const connectWallet = useCallback(async () => {
    if (!hasMetaMask()) { setError('MetaMask is not installed'); return }
    setIsConnecting(true)
    setError(null)
    try {
      const ethereum = (window as any).ethereum
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length > 0) {
        const selectedAccount = accounts[0]
        const nonceRes = await api.get(
          `/auth/nonce?address=${encodeURIComponent(selectedAccount)}`
        )
        const nonce = nonceRes.data.nonce
        const provider = new BrowserProvider(ethereum)
        const signer = await provider.getSigner()
        const signature = await signer.signMessage(nonce)
        const verifyRes = await api.post('/auth/verify', { address: selectedAccount, signature })
        setAccount(selectedAccount)
        setIsConnected(true)
        setUsername(verifyRes.data.username || null)
        setNeedsUsername(Boolean(verifyRes.data.needsUsername || !verifyRes.data.username))
        const meRes = await api.get('/me')
        setRole(meRes.data?.role || 'commenter')
        setQuotaBytes(Number(meRes.data?.quotaBytes || 0))
        setUsedBytes(Number(meRes.data?.usedBytes || 0))
        setRemainingBytes(Number(meRes.data?.remainingBytes || 0))
        const chainIdHex = await ethereum.request({ method: 'eth_chainId' })
        setChainId(parseInt(chainIdHex, 16))
        const balanceWei = await ethereum.request({ method: 'eth_getBalance', params: [selectedAccount, 'latest'] })
        setBalance((parseInt(balanceWei, 16) / 1e18).toFixed(4))
        try {
          const encryptionPublicKey = await getMyEncryptionPublicKey(selectedAccount)
          await api.post('/auth/encryption-key', { encryptionPublicKey })
        } catch (e) {
          console.warn('Could not register MetaMask encryption key', e)
        }
      }
    } catch (err: any) {
      const data = err?.response?.data
      const serverMsg =
        typeof data?.error === 'string'
          ? data.error
          : data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string'
            ? (data as any).message
            : null
      const isNetwork = err?.message === 'Network Error' || err?.code === 'ERR_NETWORK'
      setError(
        err?.code === 4001
          ? 'Connection rejected by user'
          : isNetwork
            ? 'Cannot reach the API. Start the backend (npm start in the project root) and ensure Next.js rewrites point to it (BACKEND_URL / port 5000).'
            : serverMsg || err?.message || 'Failed to connect wallet'
      )
      setIsConnected(false)
      setAccount(null)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (e: any) {
      const isNetwork = e?.message === 'Network Error' || e?.code === 'ERR_NETWORK'
      if (!isNetwork) console.error('Logout error', e)
    }
    setIsConnected(false)
    setAccount(null)
    setChainId(null)
    setBalance(null)
    setUsername(null)
    setRole(null)
    setQuotaBytes(0)
    setUsedBytes(0)
    setRemainingBytes(0)
    setNeedsUsername(false)
    setError(null)
  }, [])

  const saveUsername = useCallback(async (chosen: string) => {
    const res = await api.post('/auth/username', { username: chosen })
    setUsername(res.data.username)
    setNeedsUsername(false)
  }, [])

  // Restore session on page reload
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const userRes = await api.get('/me')
        if (userRes.data?.id && hasMetaMask()) {
          const ethereum = (window as any).ethereum
          const accounts = await ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setAccount(accounts[0])
            setIsConnected(true)
            setUsername(userRes.data.username || null)
            setNeedsUsername(!userRes.data.username)
            setRole(userRes.data?.role || 'commenter')
            setQuotaBytes(Number(userRes.data?.quotaBytes || 0))
            setUsedBytes(Number(userRes.data?.usedBytes || 0))
            setRemainingBytes(Number(userRes.data?.remainingBytes || 0))
            const chainIdHex = await ethereum.request({ method: 'eth_chainId' })
            setChainId(parseInt(chainIdHex, 16))
            const balanceWei = await ethereum.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] })
            setBalance((parseInt(balanceWei, 16) / 1e18).toFixed(4))
          } else {
            await api.post('/auth/logout')
          }
        }
      } catch { console.log('No existing session') }
    }
    checkConnection()
  }, [])

  useEffect(() => {
    if (!hasMetaMask() || !account) return
    const ethereum = (window as any).ethereum
    const onAccountsChanged = (newAccounts: string[]) => {
      if (newAccounts.length === 0) void disconnectWallet()
      else setAccount(newAccounts[0])
    }
    const onChainChanged = (newChainId: string) => {
      setChainId(parseInt(newChainId, 16))
    }
    ethereum.on('accountsChanged', onAccountsChanged)
    ethereum.on('chainChanged', onChainChanged)
    return () => {
      ethereum.removeListener('accountsChanged', onAccountsChanged)
      ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [account, disconnectWallet])

  return (
    <Web3Context.Provider value={{ isConnected, account, chainId, balance, username, role, quotaBytes, usedBytes, remainingBytes, needsUsername, connectWallet, disconnectWallet, saveUsername, isConnecting, error }}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (!context) throw new Error('useWeb3 must be used within a Web3Provider')
  return context
}
