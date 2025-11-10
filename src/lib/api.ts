const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")

export const API_ERROR_MESSAGE = 'No se pudo cargar datos por CORS/Red. Reintenta.'

export function apiUrl(path: string) {
  const normalizedPath = path == null ? "" : String(path)
  return new URL(normalizedPath, API_BASE + "/").toString()
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
