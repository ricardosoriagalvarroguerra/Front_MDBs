export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const cacheStore = new Map()

function nowMs() {
  return Date.now()
}

function shouldReuse(entry, ttlMs) {
  if (!entry || ttlMs <= 0) return false
  return nowMs() - entry.timestamp <= ttlMs
}

export function invalidateApiCache(prefix = null) {
  if (!prefix) {
    cacheStore.clear()
    return
  }
  const normalized = String(prefix)
  for (const key of cacheStore.keys()) {
    if (key.startsWith(normalized)) {
      cacheStore.delete(key)
    }
  }
}

export async function apiGet(path, options = {}) {
  const {
    signal,
    cacheKey = path,
    cacheTtlMs = 5 * 60 * 1000,
    revalidate = false,
    fetchInit = {},
  } = options

  const url = `${API_BASE_URL}${path}`
  const entry = cacheStore.get(cacheKey)
  if (!revalidate && shouldReuse(entry, cacheTtlMs)) {
    return entry.data
  }

  const controller = signal ? null : (typeof AbortController !== 'undefined' ? new AbortController() : null)
  const finalSignal = signal || controller?.signal

  try {
    const res = await fetch(url, { ...fetchInit, signal: finalSignal })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} - ${text}`)
    }
    const data = await res.json()
    if (cacheTtlMs > 0) {
      cacheStore.set(cacheKey, { timestamp: nowMs(), data })
    }
    return data
  } catch (error) {
    if (controller && finalSignal?.aborted) {
      // Propagar AbortError estándar
      throw error
    }
    if (error?.name === 'AbortError') {
      throw error
    }
    cacheStore.delete(cacheKey)
    throw error
  }
}
