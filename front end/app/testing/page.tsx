'use client'

import { useState } from 'react'
import axios from 'axios'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Me = { id: number; username: string; role: string; usedBytes: number; remainingBytes: number }
type FileRow = { id: number; filename: string; cid: string; tx_hash?: string | null }

function AccountPanel({ label }: { label: string }) {
  const [userId, setUserId] = useState('1')
  const [me, setMe] = useState<Me | null>(null)
  const [files, setFiles] = useState<FileRow[]>([])
  const [error, setError] = useState('')

  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || '',
    withCredentials: true,
    headers: { 'x-test-user-id': userId },
  })

  const load = async () => {
    setError('')
    try {
      const meRes = await client.get('/me')
      const filesRes = await client.get('/files')
      setMe(meRes.data)
      setFiles(filesRes.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
          <Button onClick={load}>Load</Button>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {me && (
          <div className="rounded border p-3 text-sm">
            <div><b>ID:</b> {me.id}</div>
            <div><b>User:</b> {me.username}</div>
            <div><b>Role:</b> {me.role}</div>
            <div><b>Used:</b> {me.usedBytes}</div>
            <div><b>Remaining:</b> {me.remainingBytes}</div>
          </div>
        )}
        <div className="max-h-80 overflow-auto rounded border">
          {files.map((f) => (
            <div key={f.id} className="border-b p-2 text-sm">
              <div className="font-medium">{f.filename}</div>
              <div className="text-xs text-muted-foreground">CID: {f.cid}</div>
              <div className="text-xs text-muted-foreground">Tx: {f.tx_hash || '—'}</div>
            </div>
          ))}
          {!files.length && <div className="p-3 text-sm text-muted-foreground">No files loaded.</div>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TestingPage() {
  return (
    <MainLayout title="Dual Account Testing">
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <AccountPanel label="Account A" />
        <AccountPanel label="Account B" />
      </div>
    </MainLayout>
  )
}

