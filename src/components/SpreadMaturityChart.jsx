import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { apiGet } from '../lib/api'

const SERIES_CONFIG = [
  { key: 'year_1', label: '1 Year', color: '#0f766e' },
  { key: 'year_3', label: '3 Year', color: '#2563eb' },
  { key: 'year_5', label: '5 Year', color: '#f97316' },
  { key: 'year_10', label: '10 Year', color: '#1e3a8a' },
  { key: 'year_15', label: '15 Year', color: '#d97706' },
]

const YEAR_KEYS = SERIES_CONFIG.map((serie) => serie.key)

const DATE_FORMAT_TOOLTIP = d3.utcFormat('%d %b %Y')
const DATE_FORMAT_SHORT = d3.utcFormat('%b %Y')
const DATE_FORMAT_YEAR = d3.utcFormat('%Y')

const RANGE_OPTIONS = [
  { id: '5y', label: '5Y', helper: 'todo el rango' },
  { id: '3y', label: '3Y', helper: 'últimos 3 años' },
  { id: '1y', label: 'Last Y', helper: 'último año' },
]

const DEFAULT_START_DATE = '2010-01-01'

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}

export default function SpreadMaturityChart() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const { width: containerWidth } = useResizeObserver(containerRef)

  const [rows, setRows] = useState([])
  const [range, setRange] = useState('5y')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('start_date', DEFAULT_START_DATE)
        const queryString = params.toString()
        const res = await apiGet(`/maturity/?${queryString}`, { cacheKey: `maturity:${queryString}` })
        if (cancelled) return
        const array = Array.isArray(res) ? res : []
        const parsed = array
          .map((row) => {
            const rawDate = row.date
            if (!rawDate) return null
            const parsedDate = new Date(`${rawDate}T00:00:00Z`)
            const timestamp = parsedDate.getTime()
            if (Number.isNaN(timestamp)) return null
            const values = {}
            for (const key of YEAR_KEYS) {
              const value = row[key]
              values[key] = value == null ? null : Number(value)
            }
            return {
              date: parsedDate,
              timestamp,
              ...values,
            }
          })
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp)
        setRows(parsed)
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Error al cargar datos')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    if (rows.length === 0) return []
    if (range === '5y') return rows
    const latest = rows[rows.length - 1]
    if (!latest) return rows
    const anchor = new Date(latest.timestamp)
    if (range === '3y') {
      anchor.setUTCFullYear(anchor.getUTCFullYear() - 3)
    } else if (range === '1y') {
      anchor.setUTCFullYear(anchor.getUTCFullYear() - 1)
    }
    const cutoffTs = anchor.getTime()
    const filtered = rows.filter((row) => row.timestamp >= cutoffTs)
    return filtered.length > 0 ? filtered : rows
  }, [rows, range])

  const seriesData = useMemo(() => {
    if (filteredRows.length === 0) return SERIES_CONFIG.map((cfg) => ({ ...cfg, values: [] }))
    return SERIES_CONFIG.map((cfg) => ({
      ...cfg,
      values: filteredRows.map((row) => ({
        date: row.date,
        timestamp: row.timestamp,
        value: row[cfg.key],
      })),
    }))
  }, [filteredRows])

  const allDates = useMemo(() => filteredRows.map((row) => row.date), [filteredRows])

  const allValues = useMemo(() => {
    const values = []
    for (const series of seriesData) {
      for (const point of series.values) {
        if (point.value != null && Number.isFinite(point.value)) {
          values.push(point.value)
        }
      }
    }
    return values
  }, [seriesData])

  useEffect(() => {
    const svgEl = svgRef.current
    const tooltipEl = tooltipRef.current
    const containerEl = containerRef.current

    if (!svgEl || !containerEl || seriesData.every((serie) => serie.values.length === 0) || allDates.length === 0) {
      if (svgEl) d3.select(svgEl).selectAll('*').remove()
      if (tooltipEl) tooltipEl.style.display = 'none'
      return
    }

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const fallbackWidth = containerEl.clientWidth || 920
    const width = Math.max(420, containerWidth || fallbackWidth)
    const height = Math.max(480, Math.round(width * 0.55))
    const margin = { top: 72, right: 88, bottom: 68, left: 80 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    if (innerWidth <= 0 || innerHeight <= 0) return

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const extentDates = d3.extent(allDates)
    const x = d3.scaleUtc().domain(extentDates).range([0, innerWidth])

    let axisTickFormatter = DATE_FORMAT_SHORT
    if (extentDates[0] && extentDates[1]) {
      const totalDays = (extentDates[1].getTime() - extentDates[0].getTime()) / (1000 * 60 * 60 * 24)
      if (totalDays > 730) {
        axisTickFormatter = DATE_FORMAT_YEAR
      }
    }

    const approxLabelWidth = 90
    const maxTicks = Math.min(allDates.length, Math.max(3, Math.floor(innerWidth / approxLabelWidth)))

    const valueExtent = d3.extent(allValues)
    const minValue = valueExtent[0] ?? 0
    const maxValue = valueExtent[1] ?? 0
    const padding = Math.max(10, (maxValue - minValue) * 0.05)
    const y = d3
      .scaleLinear()
      .domain([minValue - padding, maxValue + padding])
      .nice()
      .range([innerHeight, 0])

    const grid = d3
      .axisLeft(y)
      .ticks(8)
      .tickSize(-innerWidth)
      .tickFormat(() => '')

    g.append('g')
      .attr('class', 'grid-lines')
      .call(grid)
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '2,2')

    g.select('.grid-lines').select('path').remove()

    const xAxis = d3
      .axisBottom(x)
      .ticks(maxTicks)
      .tickFormat((d) => axisTickFormatter(d instanceof Date ? d : new Date(d)))
      .tickPadding(8)

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .call((axis) => axis.selectAll('text').attr('font-size', 11).attr('fill', '#475569'))
      .call((axis) => axis.select('path').attr('stroke', '#94a3b8'))
      .call((axis) => axis.selectAll('line').attr('stroke', '#cbd5e1'))

    const yAxis = d3
      .axisLeft(y)
      .ticks(8)
      .tickFormat((d) => `${d3.format('.0f')(d)} bp`)
      .tickPadding(8)

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call((axis) => axis.selectAll('text').attr('font-size', 11).attr('fill', '#475569'))
      .call((axis) => axis.select('path').attr('stroke', '#94a3b8'))
      .call((axis) => axis.selectAll('line').attr('stroke', '#cbd5e1'))

    g.append('text')
      .attr('x', -margin.left + 8)
      .attr('y', -24)
      .attr('fill', '#334155')
      .attr('font-size', 13)
      .attr('font-weight', '600')
      .text('Evolución de spreads por madurez (bp)')

    const lineGenerator = d3
      .line()
      .defined((d) => d.value != null && Number.isFinite(d.value))
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    const seriesGroups = g.selectAll('.series').data(seriesData).join('g').attr('class', 'series')

    seriesGroups
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('opacity', (d) => (d.values.some((v) => v.value != null && Number.isFinite(v.value)) ? 1 : 0.15))
      .attr('d', (d) => lineGenerator(d.values))

    seriesGroups
      .append('text')
      .attr('class', 'series-label')
      .attr('x', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        return last ? x(last.date) + 6 : innerWidth + 6
      })
      .attr('y', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        return last ? y(last.value) : y(minValue - padding)
      })
      .attr('fill', (d) => d.color)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('alignment-baseline', 'middle')
      .text((d) => d.label)

    const focusGroup = g.append('g').attr('class', 'focus-overlay').style('display', 'none')
    const focusLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.7)

    const focusDots = focusGroup
      .selectAll('circle')
      .data(seriesData)
      .join('circle')
      .attr('r', 4.5)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    const seriesValueMaps = seriesData.map((series) => ({
      key: series.key,
      label: series.label,
      color: series.color,
      map: new Map(series.values.map((v) => [v.timestamp, v.value])),
    }))

    const overlay = g
      .append('rect')
      .attr('class', 'interaction-layer')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    const timestamps = filteredRows.map((row) => row.timestamp)
    const nearestTimestamp = (raw) => {
      if (timestamps.length === 0) return null
      const rawTs = raw instanceof Date ? raw.getTime() : Number(raw)
      if (Number.isNaN(rawTs)) return timestamps[0]
      let candidate = timestamps[0]
      let minDiff = Number.POSITIVE_INFINITY
      for (const ts of timestamps) {
        const diff = Math.abs(ts - rawTs)
        if (diff < minDiff) {
          minDiff = diff
          candidate = ts
        }
      }
      return candidate
    }

    const showTooltip = (event) => {
      const [mx] = d3.pointer(event, g.node())
      const xValue = x.invert(mx)
      const ts = nearestTimestamp(xValue)
      if (ts == null) {
        focusGroup.style('display', 'none')
        if (tooltipEl) {
          tooltipEl.style.display = 'none'
        }
        return
      }
      const date = new Date(ts)
      const xPos = x(date)

      const rowsForTooltip = []
      let anyValue = false
      seriesValueMaps.forEach((series, idx) => {
        const value = series.map.get(ts)
        if (value != null && Number.isFinite(value)) {
          anyValue = true
          rowsForTooltip.push({
            label: series.label,
            value,
            color: series.color,
          })
        }
        const dot = focusDots.nodes()[idx]
        if (dot) {
          d3.select(dot)
            .attr('cx', xPos)
            .attr('cy', value != null && Number.isFinite(value) ? y(value) : y(minValue - padding))
            .attr('opacity', value != null && Number.isFinite(value) ? 1 : 0)
        }
      })

      if (!anyValue) {
        focusGroup.style('display', 'none')
        if (tooltipEl) {
          tooltipEl.style.display = 'none'
        }
        return
      }

      focusGroup.style('display', null)
      focusLine.attr('x1', xPos).attr('x2', xPos)

      if (tooltipEl) {
        tooltipEl.style.display = 'block'
        tooltipEl.innerHTML = `
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">${DATE_FORMAT_TOOLTIP(date)}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] leading-tight">
            ${rowsForTooltip
              .map(
                (row) => `
                  <div class="flex items-center gap-2">
                    <span class="inline-flex size-2.5 rounded-full" style="background:${row.color}"></span>
                    <span class="font-medium text-slate-700">${row.label}</span>
                    <span class="text-right text-slate-500">${row.value.toFixed(1)} bp</span>
                  </div>
                `
              )
              .join('')}
          </div>
        `
        const tooltipWidth = tooltipEl.offsetWidth || 200
        const absoluteX = margin.left + xPos
        let tooltipLeft = absoluteX + 16
        if (tooltipLeft + tooltipWidth > width) {
          tooltipLeft = absoluteX - tooltipWidth - 16
        }
        tooltipEl.style.left = `${Math.max(8, tooltipLeft)}px`
        tooltipEl.style.top = `${Math.max(8, margin.top + 16)}px`
      }
    }

    overlay.on('mousemove', showTooltip)
    overlay.on('mouseleave', () => {
      focusGroup.style('display', 'none')
      if (tooltipEl) {
        tooltipEl.style.display = 'none'
      }
    })
  }, [seriesData, allDates, allValues, filteredRows, containerWidth])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] rounded-xl border border-slate-200 bg-white shadow-sm p-4"
    >
      <div className="flex flex-wrap items-center justify-start gap-3 mb-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Spread Maturity</p>
        <p className="text-sm text-slate-600">
          Histórico de spreads por madurez (1–15 años) en puntos básicos para la calificación Moody's A2; compara la curva
          completa a través del tiempo.
        </p>
      </div>
    </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="uppercase tracking-wide text-slate-500 font-semibold">Rango:</span>
        {RANGE_OPTIONS.map((option) => {
          const selected = range === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                selected ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-slate-500">Cargando…</div>
      ) : error ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-slate-500">
          No hay datos disponibles.
        </div>
      ) : (
        <>
          <svg ref={svgRef} className="w-full" role="img" aria-label="Gráfico de Spread por Madurez" />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
            style={{ minWidth: '200px' }}
          />
          <div className="mt-4 text-xs text-slate-500">
            <span className="text-slate-600">Nota:</span> se grafican los tramos más representativos del rating Moody's A2 (1Y, 3Y, 5Y, 10Y y 15Y).
            Usa los controles de rango para recorrer todo el histórico (5Y), los últimos 3 años o el último año.
          </div>
        </>
      )}
    </div>
  )
}
