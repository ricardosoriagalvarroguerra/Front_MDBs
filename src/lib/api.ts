const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim()
const API_BASE = RAW_API_BASE.replace(/\/+$/, "")
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/
const PROTOCOL_RELATIVE_PATTERN = /^\/\//

export const API_ERROR_MESSAGE = 'No se pudo cargar datos por CORS/Red. Reintenta.'

function joinWithSlash(base: string, path: string) {
  const normalizedBase = base.replace(/\/+$/, "")
  const normalizedPath = path.replace(/^\/+/, "")
  if (!normalizedPath) {
    return `${normalizedBase}/`
  }
  return `${normalizedBase}/${normalizedPath}`
}

export function apiUrl(path: string) {
  const normalizedPath = path == null ? "" : String(path)

  if (ABSOLUTE_URL_PATTERN.test(normalizedPath)) {
    return normalizedPath
  }

  if (API_BASE) {
    if (ABSOLUTE_URL_PATTERN.test(API_BASE) || PROTOCOL_RELATIVE_PATTERN.test(API_BASE)) {
      try {
        return new URL(normalizedPath || ".", API_BASE.replace(/\/+$/, "") + "/").toString()
      } catch (error) {
        console.warn("Falling back to path join for API base", API_BASE, error)
      }
    }

    const relativeBase = API_BASE.startsWith("/") ? API_BASE : `/${API_BASE}`
    return joinWithSlash(relativeBase, normalizedPath)
  }

  if (!normalizedPath) {
    return "/"
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`
}

export async function fetchJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = apiUrl(path)
  try {
    const res = await fetch(url, {
      // credentials: "include",
      ...init,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${url}\n${text}`)
    }

    return (await res.json()) as T
  } catch (error) {
    console.error("API request failed", url, error)
    throw error
  }
}

export const Api = {
  metrics: () => fetchJson("metrics/"),
  mdbs: () => fetchJson("mdbs/"),
  metricValues: (metric_id: string, year_from = 2000) =>
    fetchJson(`metric-values/?metric_id=${encodeURIComponent(metric_id)}&year_from=${year_from}`),
}
