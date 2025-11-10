import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { apiGet } from '../lib/api'
import { colorForMdbCode } from '../lib/colors'

const METRIC_CONFIG = [
  { id: 'moodys_10', defaultLabel: 'Moodys 10', color: '#2563eb' },
  { id: 'moodys_11', defaultLabel: 'Moodys 11', color: '#f97316', dash: '5,3' },
]

const DEFAULT_MDB_CODES = ['FONPLATA', 'CAF', 'IADB', 'IBRD', 'CABEI', 'CDB-CAR']
const DEFAULT_START_DATE = '2010-01-01'

const RATING_SCALE = [
  { code: 'Aaa', value: 0 },
  { code: 'Aa1', value: 1 },
  { code: 'Aa2', value: 2 },
  { code: 'Aa3', value: 3 },
  { code: 'A1', value: 4 },
  { code: 'A2', value: 5 },
  { code: 'A3', value: 6 },
  { code: 'Baa1', value: 7 },
  { code: 'Baa2', value: 8 },
  { code: 'Baa3', value: 9 },
  { code: 'Ba1', value: 10 },
  { code: 'Ba2', value: 11 },
  { code: 'Ba3', value: 12 },
  { code: 'B1', value: 13 },
  { code: 'B2', value: 14 },
  { code: 'B3', value: 15 },
  { code: 'Caa1', value: 16 },
  { code: 'Caa2', value: 17 },
  { code: 'Caa3', value: 18 },
  { code: 'Ca', value: 19 },
  { code: 'C', value: 20 },
]

const RATING_BY_VALUE = new Map(RATING_SCALE.map((item) => [item.value, item.code]))
const RATING_VALUES = RATING_SCALE.map((item) => item.value)
const DATE_FORMATTER = d3.utcFormat('%d %b %Y')
const DATE_FORMAT_SHORT = d3.utcFormat('%d %b')
const DATE_FORMAT_MONTH = d3.utcFormat('%b %Y')
const DATE_FORMAT_YEAR = d3.utcFormat('%Y')
const MAX_DISPLAY_RATING_CODE = 'B1'
const MAX_DISPLAY_RATING_VALUE =
  RATING_SCALE.find((item) => item.code === MAX_DISPLAY_RATING_CODE)?.value ?? RATING_VALUES[RATING_VALUES.length - 1]
const DISPLAY_RATING_VALUES = RATING_VALUES.filter((value) => value <= MAX_DISPLAY_RATING_VALUE)

function ratingLabelForValue(value) {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value)
  return RATING_BY_VALUE.get(rounded) || String(rounded)
}

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

export default function MarketSignalChart({ onSelectedMdbChange }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const { width: containerWidth } = useResizeObserver(containerRef)

  const [mdbList, setMdbList] = useState([])
  const [valuesByMdb, setValuesByMdb] = useState(new Map())
  const [metricMetaById, setMetricMetaById] = useState(new Map())
  const [selectedMdbId, setSelectedMdbId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hiddenSeries, setHiddenSeries] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        METRIC_CONFIG.forEach((cfg) => params.append('metric_id', cfg.id))
        params.set('start_date', DEFAULT_START_DATE)
        const queryString = params.toString()

        const [valuesRes, mdbsRes, metricsRes] = await Promise.all([
          apiGet(`/moodys-ratings-daily/?${queryString}`, { cacheKey: `moodys-ratings:${queryString}` }),
          apiGet('/mdbs/', { cacheTtlMs: 10 * 60 * 1000 }),
          apiGet('/metrics/', { cacheTtlMs: 10 * 60 * 1000 }),
        ])
        if (cancelled) return

        const byMdb = new Map()
        const rowsByMetric = new Map()
        const rowsArray = Array.isArray(valuesRes) ? valuesRes : []
        for (const row of rowsArray) {
          const metricId = typeof row.metric_id === 'string' ? row.metric_id : null
          if (!metricId) continue
          if (!rowsByMetric.has(metricId)) {
            rowsByMetric.set(metricId, [])
          }
          rowsByMetric.get(metricId).push(row)
        }

        for (const cfg of METRIC_CONFIG) {
          const rows = rowsByMetric.get(cfg.id) || []
          for (const row of rows) {
            const mdbId = row.mdb_id
            if (mdbId == null) continue
            const rawDate = row.rating_date
            if (!rawDate) continue
            const parsedDate = new Date(`${rawDate}T00:00:00Z`)
            const timestamp = parsedDate.getTime()
            if (Number.isNaN(timestamp)) continue
            const value = row.value == null ? null : Number(row.value)
            if (!byMdb.has(mdbId)) {
              byMdb.set(mdbId, {
                metrics: new Map(),
              })
            }
            const entry = byMdb.get(mdbId)
            if (!entry.metrics.has(cfg.id)) {
              entry.metrics.set(cfg.id, [])
            }
            entry.metrics.get(cfg.id).push({
              date: parsedDate,
              timestamp,
              value: Number.isFinite(value) ? value : null,
            })
          }
        }

        for (const entry of byMdb.values()) {
          const rawRating = entry.metrics.get('moodys_11')
          const rawBondImplied = entry.metrics.get('moodys_10')

          if (rawRating) {
            entry.metrics.set('moodys_10', rawRating)
          } else {
            entry.metrics.delete('moodys_10')
          }

          if (rawBondImplied) {
            entry.metrics.set('moodys_11', rawBondImplied)
          } else {
            entry.metrics.delete('moodys_11')
          }

          for (const arr of entry.metrics.values()) {
            arr.sort((a, b) => a.timestamp - b.timestamp)
          }
        }

        const mdbArray = Array.isArray(mdbsRes) ? mdbsRes : []
        const filteredMdbs = mdbArray.filter((mdb) => {
          const entry = byMdb.get(mdb.mdb_id)
          if (!entry) return false
          return METRIC_CONFIG.some((cfg) => {
            const values = entry.metrics.get(cfg.id) || []
            return values.length > 0
          })
        })

        setMdbList(filteredMdbs)
        const map = new Map((Array.isArray(metricsRes) ? metricsRes : []).map((m) => [m.metric_id, m]))
        setMetricMetaById(map)
        setValuesByMdb(byMdb)

        if (filteredMdbs.length > 0) {
          const byCodeOrder = new Map(DEFAULT_MDB_CODES.map((code, idx) => [code, idx]))
          const ordered = [...filteredMdbs].sort((a, b) => {
            const codeA = String(a.mdb_code || '').toUpperCase()
            const codeB = String(b.mdb_code || '').toUpperCase()
            const scoreA = byCodeOrder.has(codeA) ? byCodeOrder.get(codeA) : Number.POSITIVE_INFINITY
            const scoreB = byCodeOrder.has(codeB) ? byCodeOrder.get(codeB) : Number.POSITIVE_INFINITY
            if (scoreA !== scoreB) return scoreA - scoreB
            return String(a.mdb_name || '').localeCompare(String(b.mdb_name || ''))
          })
          const fonplata = ordered.find((mdb) => String(mdb.mdb_code || '').toUpperCase() === 'FONPLATA')
          setSelectedMdbId((prev) => prev ?? (fonplata?.mdb_id ?? ordered[0]?.mdb_id ?? null))
        } else {
          setSelectedMdbId(null)
        }
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

  const orderedMdbs = useMemo(() => {
    if (!Array.isArray(mdbList)) return []
    const order = new Map(DEFAULT_MDB_CODES.map((code, idx) => [code, idx]))
    return [...mdbList].sort((a, b) => {
      const codeA = String(a.mdb_code || '').toUpperCase()
      const codeB = String(b.mdb_code || '').toUpperCase()
      const scoreA = order.has(codeA) ? order.get(codeA) : Number.POSITIVE_INFINITY
      const scoreB = order.has(codeB) ? order.get(codeB) : Number.POSITIVE_INFINITY
      if (scoreA !== scoreB) return scoreA - scoreB
      return String(a.mdb_name || '').localeCompare(String(b.mdb_name || ''))
    })
  }, [mdbList])

  const selectedSeries = useMemo(() => {
    if (!selectedMdbId) return []
    const entry = valuesByMdb.get(selectedMdbId)
    if (!entry) return []
    return METRIC_CONFIG.map((cfg) => {
      const values = entry.metrics.get(cfg.id) || []
      return {
        ...cfg,
        label: metricMetaById.get(cfg.id)?.metric_name || cfg.defaultLabel,
        values,
      }
    })
  }, [metricMetaById, selectedMdbId, valuesByMdb])

  useEffect(() => {
    setHiddenSeries((prev) => {
      if (prev.size === 0) return prev
      const available = new Set(selectedSeries.map((s) => s.id))
      let changed = false
      const next = new Set()
      prev.forEach((id) => {
        if (available.has(id)) next.add(id)
        else changed = true
      })
      return changed ? next : prev
    })
  }, [selectedSeries])

  const toggleMetricVisibility = useCallback((seriesId) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(seriesId)) next.delete(seriesId)
      else next.add(seriesId)
      return next
    })
  }, [setHiddenSeries])

  const allDates = useMemo(() => {
    const timestamps = new Set()
    for (const series of selectedSeries) {
      for (const point of series.values) {
        if (Number.isFinite(point.timestamp)) timestamps.add(point.timestamp)
      }
    }
    return Array.from(timestamps)
      .sort((a, b) => a - b)
      .map((ts) => new Date(ts))
  }, [selectedSeries])

  const selectedMdb = useMemo(
    () => orderedMdbs.find((mdb) => mdb.mdb_id === selectedMdbId) || null,
    [orderedMdbs, selectedMdbId]
  )

  useEffect(() => {
    if (typeof onSelectedMdbChange === 'function') {
      onSelectedMdbChange(selectedMdb || null)
    }
  }, [onSelectedMdbChange, selectedMdb])

  useEffect(() => {
    const svgEl = svgRef.current
    const tooltipEl = tooltipRef.current
    const containerEl = containerRef.current
    if (!svgEl || !containerEl || selectedSeries.length === 0 || allDates.length === 0) {
      if (svgEl) d3.select(svgEl).selectAll('*').remove()
      if (tooltipEl) tooltipEl.style.display = 'none'
      return
    }

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const fallbackWidth = containerEl.clientWidth || 800
    const width = Math.max(360, containerWidth || fallbackWidth || 800)
    const height = Math.max(440, Math.round(width * 0.5))
    const margin = { top: 64, right: 128, bottom: 56, left: 84 }
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
      } else if (totalDays > 90) {
        axisTickFormatter = DATE_FORMAT_MONTH
      }
    }

    const approxLabelWidth = 90
    const maxTicks = Math.min(allDates.length, Math.max(2, Math.floor(innerWidth / approxLabelWidth)))

    const y = d3
      .scaleLinear()
      .domain([MAX_DISPLAY_RATING_VALUE + 0.5, DISPLAY_RATING_VALUES[0] - 0.5])
      .range([innerHeight, 0])

    const grid = d3
      .axisLeft(y)
      .tickValues(DISPLAY_RATING_VALUES)
      .tickSize(-innerWidth)
      .tickFormat(() => '')

    g.append('g')
      .attr('class', 'grid-lines')
      .call(grid)
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '2,2')

    g.select('.grid-lines').select('path').remove()

    const yAxis = d3
      .axisLeft(y)
      .tickValues(DISPLAY_RATING_VALUES)
      .tickFormat((d) => ratingLabelForValue(d))
      .tickPadding(8)

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call((axis) => axis.selectAll('text').attr('font-size', 11).attr('fill', '#475569'))
      .call((axis) => axis.select('path').attr('stroke', '#94a3b8'))
      .call((axis) => axis.selectAll('line').attr('stroke', '#cbd5e1'))

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

    const lineGenerator = d3
      .line()
      .defined((d) => d.value != null && Number.isFinite(d.value))
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    const activeSeries = selectedSeries.filter((series) => !hiddenSeries.has(series.id))

    const seriesGroups = g.selectAll('.series').data(selectedSeries).join('g').attr('class', 'series')

    seriesGroups
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) => d.dash || null)
      .attr('d', (d) => lineGenerator(d.values))
      .attr('opacity', (d) => (hiddenSeries.has(d.id) ? 0.25 : 1))

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
      .data(activeSeries, (d) => d.id)
      .join('circle')
      .attr('r', 5)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    const seriesValueMaps = activeSeries.map((series) => ({
      id: series.id,
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
      .style('cursor', activeSeries.length > 0 ? 'crosshair' : 'default')

    const nearestDate = (raw) => {
      const rawTs = raw instanceof Date ? raw.getTime() : Number(raw)
      if (Number.isNaN(rawTs)) return allDates[0]
      let candidate = allDates[0]
      let minDiff = Number.POSITIVE_INFINITY
      for (const date of allDates) {
        const diff = Math.abs(date.getTime() - rawTs)
        if (diff < minDiff) {
          minDiff = diff
          candidate = date
        }
      }
      return candidate
    }

    const showTooltip = (event) => {
      const [mx] = d3.pointer(event, g.node())
      const xValue = x.invert(mx)
      const date = nearestDate(xValue)
      if (!date) {
        focusGroup.style('display', 'none')
        if (tooltipEl) {
          tooltipEl.style.display = 'none'
        }
        return
      }
      const timestamp = date.getTime()
      const xPos = x(date)

      const rows = []
      let anyValue = false
      seriesValueMaps.forEach((series, idx) => {
        const value = series.map.get(timestamp)
        if (value != null && Number.isFinite(value)) {
          anyValue = true
          rows.push({
            label: series.label,
            value,
            color: series.color,
            rating: ratingLabelForValue(value),
          })
        }
        const dot = focusDots.nodes()[idx]
        if (dot) {
          d3.select(dot)
            .attr('cx', xPos)
            .attr('cy', value != null && Number.isFinite(value) ? y(value) : y(MAX_DISPLAY_RATING_VALUE))
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
        const formattedDate = DATE_FORMATTER(date)
        tooltipEl.innerHTML = `
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Fecha ${formattedDate}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] leading-tight">
            ${rows
              .map(
                (row) => `
                  <div class="flex items-center gap-2">
                    <span class="inline-flex size-2.5 rounded-full" style="background:${row.color}"></span>
                    <span class="font-medium text-slate-700">${row.label}</span>
                    <span class="text-right text-slate-500">${row.rating} (${row.value.toFixed(0)})</span>
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

    overlay.on('mousemove', (event) => {
      showTooltip(event)
    })

    overlay.on('mouseleave', () => {
      focusGroup.style('display', 'none')
      if (tooltipEl) {
        tooltipEl.style.display = 'none'
      }
    })

    const labelLayer = g.append('g').attr('class', 'series-labels')
    const labels = labelLayer
      .selectAll('text')
      .data(selectedSeries, (d) => d.id)
      .join('text')
      .attr('class', 'series-label')
      .attr('x', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        const baseX = last ? x(last.date) : innerWidth
        return Math.min(innerWidth + 80, baseX + 12)
      })
      .attr('y', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        if (last) return y(last.value)
        const domain = y.domain()
        return y(domain[0] ?? 0)
      })
      .attr('fill', (d) => d.color)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'start')
      .style('pointer-events', 'auto')
      .style('cursor', 'pointer')
      .attr('opacity', (d) => (hiddenSeries.has(d.id) ? 0.35 : 1))
      .text((d) => d.label)
      .on('click', (_, d) => {
        toggleMetricVisibility(d.id)
      })

    labels.append('title').text('Alternar visibilidad de la serie')
  }, [selectedSeries, allDates, valuesByMdb, mdbList, selectedMdbId, metricMetaById, containerWidth, hiddenSeries, toggleMetricVisibility])

  const sources = useMemo(() => {
    const items = []
    for (const cfg of METRIC_CONFIG) {
      const meta = metricMetaById.get(cfg.id)
      if (!meta || !meta.source) continue
      const label = meta.source.trim()
      if (!label) continue
      const key = label.toLowerCase()
      if (!items.some((item) => item.key === key)) {
        items.push({ key, label })
      }
    }
    return items
  }, [metricMetaById])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] rounded-xl border border-slate-200 bg-white shadow-sm p-4"
    >
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Market Signal</p>
        <p className="text-sm text-slate-600">Serie histórica en escala numeral (Aaa=0 ... C=20) con dos lecturas simultáneas.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Selecciona MDB:</span>
        <div className="flex flex-wrap gap-2">
          {orderedMdbs.map((mdb) => {
            const code = String(mdb.mdb_code || mdb.mdb_name || '').toUpperCase()
            const color = colorForMdbCode(code, '#0f172a')
            const isSelected = mdb.mdb_id === selectedMdbId
            return (
              <button
                key={mdb.mdb_id}
                type="button"
                onClick={() => setSelectedMdbId(mdb.mdb_id)}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                  isSelected ? 'text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
                style={{
                  background: isSelected ? color : 'transparent',
                  borderColor: color,
                }}
              >
                {mdb.mdb_code || mdb.mdb_name}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-slate-500">Cargando...</div>
      ) : error ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-red-600">{error}</div>
      ) : selectedSeries.length === 0 || allDates.length === 0 ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-slate-500">
          No hay datos disponibles para esta selección.
        </div>
      ) : (
        <>
          {selectedMdb && (
            <div className="mb-2 text-sm text-slate-600">
              Evolución de Moody's Market Signal para <span className="font-semibold text-slate-800">{selectedMdb.mdb_name}</span>
            </div>
          )}
          <svg ref={svgRef} className="w-full" role="img" aria-label="Gráfico Moody's Market Signal" />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
            style={{ minWidth: '200px' }}
          />
          {sources.length > 0 && (
            <div className="mt-4 text-xs text-slate-500">
              <span className="text-slate-600">Fuente:</span>{' '}
              {sources.map((src, idx) => (
                <span key={src.key}>
                  {idx > 0 && <span className="text-slate-400"> · </span>}
                  {src.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
