/**
 * Extract a short, user-safe message from API / wallet errors.
 * Avoids dumping HTML, stack traces, or long axios internals into the UI.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err || typeof err !== 'object') return fallback

  const e = err as {
    code?: number | string
    message?: string
    response?: { status?: number; data?: unknown }
  }

  if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
    return 'Connection rejected'
  }

  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
    return 'Cannot reach the server. Is the backend running?'
  }

  const data = e.response?.data
  if (data && typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error.trim()
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim()
    }
  }

  if (typeof data === 'string' && data.trim() && !looksLikeHtml(data)) {
    const trimmed = data.trim()
    return trimmed.length <= 160 ? trimmed : fallback
  }

  const status = e.response?.status
  if (status === 401) return 'Not signed in. Connect your wallet and try again.'
  if (status === 403) return 'You do not have permission for this action.'
  if (status === 404) return 'Not found.'
  if (status === 409) return 'That value is already taken.'
  if (status != null && status >= 500) return 'Server error. Please try again.'

  const msg = typeof e.message === 'string' ? e.message.trim() : ''
  if (msg && isSafeUserMessage(msg)) return msg

  return fallback
}

function looksLikeHtml(value: string): boolean {
  const lower = value.toLowerCase()
  return lower.includes('<!doctype') || lower.includes('<html')
}

function isSafeUserMessage(value: string): boolean {
  if (value.length > 160) return false
  if (value.includes('\n')) return false
  if (looksLikeHtml(value)) return false
  if (/request failed with status code/i.test(value)) return false
  return true
}
