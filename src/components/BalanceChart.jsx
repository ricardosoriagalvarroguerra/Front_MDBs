import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Api, API_ERROR_MESSAGE } from '../lib/api.ts'
import { colorForMdbCode } from '../lib/colors'

function useResizeObserver(targetRef) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!targetRef.current) return
    const element = targetRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [targetRef])

  return size
}

const CHART_TYPES = [
  { id: 'sp_08', title: 'Activos totales', label: 'Activos totales' },
  { id: 'sp_10', title: 'Prestamos Netos', label: 'Prestamos Netos' },
  { id: 'sp_09', title: 'Equity', label: 'Equity' },
  { id: 'sp_11', title: 'Liabilities', label: 'Liabilities' },
]

const DEFAULT_YEAR_FROM = 2000

export default function BalanceChart() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const controlsRef = useRef(null)
  const dropdownRef = useRef(null)
  const chartTypeDropdownRef = useRef(null)
  const clipPathIdRef = useRef(`clip-${Math.random().toString(36).slice(2, 9)}`)
  const { width: containerWidth, height: containerHeight } = useResizeObserver(containerRef)
  const { height: controlsHeight } = useResizeObserver(controlsRef)

  const [data, setData] = useState([])
  const [mdbCodeById, setMdbCodeById] = useState(new Map())
  const [mdbList, setMdbList] = useState([])
  const [selectedMdbIds, setSelectedMdbIds] = useState([11, 13, 25, 29, 31])
  const [hiddenKeys, setHiddenKeys] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showChartTypePicker, setShowChartTypePicker] = useState(false)
  const [selectedChartType, setSelectedChartType] = useState('sp_08')
  const [yearDomain, setYearDomain] = useState(null)
  const [metricMetaById, setMetricMetaById] = useState(new Map())

  const availableMdbIds = useMemo(() => new Set((Array.isArray(data) ? data : []).map((d) => d.mdb_id)), [data])
  const availableMdbList = useMemo(() => mdbList.filter((m) => availableMdbIds.has(m.mdb_id)), [mdbList, availableMdbIds])
  const addableMdbList = useMemo(() => availableMdbList.filter((m) => !selectedMdbIds.includes(m.mdb_id)), [availableMdbList, selectedMdbIds])

  const legendEntries = useMemo(() => {
    const domainKeys = selectedMdbIds.map((id) => String(id))
    const defaultScale = d3.scaleOrdinal(d3.schemeTableau10).domain(domainKeys)
    return selectedMdbIds.map((mdbId) => {
      const label = mdbCodeById.get(mdbId) || String(mdbId)
      const fallbackColor = defaultScale(String(mdbId))
      const color = colorForMdbCode(label, fallbackColor)
      return { key: mdbId, label, color }
    })
  }, [selectedMdbIds, mdbCodeById])

  const toggleSeriesVisibility = useCallback((seriesKey) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(seriesKey)) next.delete(seriesKey)
      else next.add(seriesKey)
      return next
    })
  }, [setHiddenKeys])

  const removeSeries = useCallback((seriesKey) => {
    setSelectedMdbIds((prev) => prev.filter((id) => id !== seriesKey))
    setHiddenKeys((prev) => {
      if (!prev.has(seriesKey)) return prev
      const next = new Set(prev)
      next.delete(seriesKey)
      return next
    })
  }, [setHiddenKeys, setSelectedMdbIds])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const metricId = typeof selectedChartType === 'string' ? selectedChartType.trim() : ''
        if (!metricId) {
          if (!cancelled) {
            setData([])
          }
          return
        }

        const [valuesRes, mdbsRes] = await Promise.all([
          Api.metricValues(metricId, DEFAULT_YEAR_FROM),
          Api.mdbs(),
        ])
        if (!cancelled) {
          setData(Array.isArray(valuesRes) ? valuesRes : [])
          const map = new Map((Array.isArray(mdbsRes) ? mdbsRes : []).map((m) => [m.mdb_id, m.mdb_code || String(m.mdb_id)]))
          setMdbCodeById(map)
          setMdbList(Array.isArray(mdbsRes) ? mdbsRes : [])
        }
      } catch (e) {
        console.error('Error loading balance chart data', e)
        if (!cancelled) setError(API_ERROR_MESSAGE)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedChartType])

  // Cargar metadatos de métricas para resolver fuente
  useEffect(() => {
    let cancelled = false
    async function loadMeta() {
      try {
        const metricsRes = await Api.metrics()
        if (!cancelled) {
          const map = new Map((Array.isArray(metricsRes) ? metricsRes : []).map((m) => [m.metric_id, m]))
          setMetricMetaById(map)
        }
      } catch {
        // ignorar fallo de metadatos
      }
    }
    loadMeta()
    return () => { cancelled = true }
  }, [])

  const sourceInfoFor = (metricId) => {
    const meta = metricMetaById.get(metricId)
    const raw = (meta?.source || '').trim()
    if (!raw) return null
    const s = raw.toLowerCase()
    if (s.includes('mood')) return { label: "Moody's", url: 'https://www.moodys.com' }
    if (s.includes("s&p") || s.includes('spglobal') || s.includes('s&p global') || s.includes('standard & poor')) {
      return { label: 'S&P Global Market Intelligence', url: 'https://www.spglobal.com/market-intelligence/es' }
    }
    return { label: raw, url: null }
  }

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return
    const years = data.map((d) => Number(d.year)).filter((n) => Number.isFinite(n))
    if (years.length === 0) return
    const minY = d3.min(years)
    const maxY = d3.max(years)
    const desiredStart = 2014
    const safeMax = maxY ?? minY ?? desiredStart
    const startCandidate = Math.max(desiredStart, minY ?? safeMax)
    const clampedStart = Math.min(startCandidate, safeMax)
    setYearDomain([clampedStart, safeMax])
  }, [data])

  useEffect(() => {
    if (!showPicker) return
    function handleClickOutside(e) {
      const c = controlsRef.current
      if (c && !c.contains(e.target)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  useEffect(() => {
    if (!showChartTypePicker) return
    function handleClickOutside(e) {
      const c = chartTypeDropdownRef.current
      if (c && !c.contains(e.target)) setShowChartTypePicker(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showChartTypePicker])

  const grouped = useMemo(() => {
    if (!Array.isArray(data)) return []
    const parsed = data
      .map((d) => ({ mdb_id: d.mdb_id, year: Number(d.year), value: d.value == null ? null : Number(d.value) }))
      .filter((d) => Number.isFinite(d.year))

    const byMdb = d3.group(parsed, (d) => d.mdb_id)
    return Array.from(byMdb, ([mdbId, values]) => ({
      mdbId,
      values: values.filter((v) => v.value != null && Number.isFinite(v.value)).sort((a, b) => a.year - b.year),
    }))
  }, [data])

  useEffect(() => {
    const svgEl = svgRef.current
    const wrapEl = containerRef.current
    if (!svgEl || !wrapEl || !yearDomain) return

    const width = Math.max(320, containerWidth || wrapEl.clientWidth || 800)
    const height = Math.max(620, Math.round((window.innerHeight || 900) * 0.74))

    const labelAreaWidth = 72
    const sliderAreaHeight = 110
    const margin = { top: 32, right: 32 + labelAreaWidth, bottom: 40 + sliderAreaHeight, left: 56 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3.select(svgEl)
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Clipping
    const clipId = clipPathIdRef.current
    g.append('clipPath').attr('id', clipId).append('rect').attr('width', innerWidth).attr('height', innerHeight)
    const gPlot = g.append('g').attr('clip-path', `url(#${clipId})`)

    // Filtrar selección de MDBs
    const selectedSet = new Set(selectedMdbIds)
    const filteredGrouped = grouped.filter((s) => selectedSet.size === 0 || selectedSet.has(s.mdbId))

    if (!filteredGrouped.length) {
      g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight / 2).attr('text-anchor', 'middle').attr('fill', '#64748b').text('Sin datos')
      return
    }

    // Reducir valores al último disponible dentro del rango seleccionado
    const bars = filteredGrouped.map((s) => {
      const inRange = s.values.filter((v) => v.year >= yearDomain[0] && v.year <= yearDomain[1])
      const last = inRange.length ? inRange[inRange.length - 1] : s.values[s.values.length - 1]
      return { key: s.mdbId, label: mdbCodeById.get(s.mdbId) || String(s.mdbId), value: last?.value ?? null }
    }).filter((b) => b.value != null)

    // Orden ascendente
    bars.sort((a, b) => d3.ascending(a.value, b.value))

    const x = d3.scaleBand().domain(bars.map((b) => String(b.key))).range([0, innerWidth]).padding(0.25)
    const maxVal = d3.max(bars, (d) => d.value) || 0
    const yHeadroom = maxVal * 0.08
    const y = d3.scaleLinear().domain([0, maxVal + yHeadroom]).nice().range([innerHeight, 0])

    const defaultColor = d3.scaleOrdinal(d3.schemeTableau10).domain(bars.map((b) => String(b.key)))
    const colorFor = (label, key) => colorForMdbCode(label, () => defaultColor(String(key)))

    // Ejes
    const xAxis = d3.axisBottom(x).tickFormat((d) => {
      const id = Number(d)
      return mdbCodeById.get(id) || String(d)
    })
    const yAxis = d3.axisLeft(y).ticks(6)

    const xAxisG = g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis)
    xAxisG
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', (d) => {
        const key = Number(d)
        const label = mdbCodeById.get(key) || String(d)
        const baseColor = colorFor(label, key)
        return hiddenKeys.has(key) ? '#94a3b8' : baseColor
      })
      .style('opacity', (d) => (hiddenKeys.has(Number(d)) ? 0.6 : 1))
    const yAxisG = g.append('g').call(yAxis)
    yAxisG.select('.domain').remove()

    // Título
    g
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .attr('font-weight', 600)
      .attr('font-size', 14)
      .text(CHART_TYPES.find((c) => c.id === selectedChartType)?.title || '')

    // Barras
    const barsG = gPlot.append('g')
    barsG
      .selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', (d) => x(String(d.key)))
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.value))
      .attr('fill', (d) => colorFor(d.label, d.key))
      .attr('rx', 3)
      .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.25 : 1))

    // Etiquetas de valor
    const fmt = d3.format(',~f')
    barsG
      .selectAll('text')
      .data(bars)
      .join('text')
      .attr('x', (d) => (x(String(d.key)) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.45 : 1))
      .text((d) => fmt(d.value))

    // Slider de años estilizado (fuera del área del gráfico)
    const sliderG = g.append('g').attr('transform', `translate(0, ${innerHeight + 44})`)
    const yearsAll = grouped.flatMap((s) => s.values.map((v) => v.year))
    const rawMinYear = d3.min(yearsAll)
    const rawMaxYear = d3.max(yearsAll)
    const desiredMinYear = 2014
    const fallbackYear = rawMaxYear ?? rawMinYear ?? yearDomain[1] ?? yearDomain[0] ?? desiredMinYear
    const totalMinYear = Math.min(Math.max(desiredMinYear, rawMinYear ?? fallbackYear), fallbackYear)
    const totalMaxYear = Math.max(totalMinYear, rawMaxYear ?? fallbackYear)
    const sliderPadding = 10
    const sliderScale = d3.scaleLinear().domain([totalMinYear, totalMaxYear]).range([sliderPadding, innerWidth - sliderPadding])

    const clampYear = (year) => Math.max(totalMinYear, Math.min(totalMaxYear, year))
    let domainStart = clampYear(yearDomain[0])
    let domainEnd = clampYear(yearDomain[1])
    if (domainStart > domainEnd) [domainStart, domainEnd] = [domainEnd, domainStart]
    if (domainStart !== yearDomain[0] || domainEnd !== yearDomain[1]) {
      setYearDomain([domainStart, domainEnd])
    }

    // Riel
    const trackY = 12
    sliderG
      .append('line')
      .attr('x1', sliderPadding)
      .attr('x2', innerWidth - sliderPadding)
      .attr('y1', trackY)
      .attr('y2', trackY)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round')

    // Barra de selección
    const selectionBar = sliderG
      .append('rect')
      .attr('y', trackY - 3)
      .attr('height', 6)
      .attr('fill', '#e9ecef')

    // Manijas y tooltips inferiores
    const handlesG = sliderG.append('g').attr('class', 'handles')
    const handle = (cls) => {
      const gH = handlesG.append('g').attr('class', cls)
      gH.append('circle').attr('r', 8).attr('fill', '#111827').attr('stroke', '#e5e7eb').attr('stroke-width', 2)
      return gH
    }
    const handleL = handle('handle-left')
    const handleR = handle('handle-right')
    handlesG.raise()

    const tipsG = sliderG.append('g').attr('class', 'slider-tips')
    const makeTip = () => {
      const gT = tipsG.append('g').style('display', 'none')
      gT.append('rect').attr('x', -22).attr('y', 18).attr('width', 44).attr('height', 18).attr('rx', 4).attr('fill', '#ffffff').attr('stroke', '#e2e8f0')
      gT.append('text').attr('x', 0).attr('y', 27).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('fill', '#0f172a').attr('font-size', 11).attr('font-weight', 600).text('')
      return gT
    }
    const tipL = makeTip()
    const tipR = makeTip()

    // Estado interno para posiciones actuales
    let x0 = sliderScale(domainStart)
    let x1 = sliderScale(domainEnd)
    const clamp = (x) => Math.max(sliderPadding, Math.min(innerWidth - sliderPadding, x))

    const renderHandles = () => {
      selectionBar.attr('x', Math.min(x0, x1)).attr('width', Math.max(0, Math.abs(x1 - x0)))
      handleL.attr('transform', `translate(${x0}, ${trackY})`).style('display', null)
      handleR.attr('transform', `translate(${x1}, ${trackY})`).style('display', null)
    }

    const dragLeft = d3.drag().on('start', () => {
      tipL.style('display', null)
    }).on('drag', (event) => {
      x0 = clamp(event.x)
      if (x0 > x1) x0 = x1
      renderHandles()
      tipL.attr('transform', `translate(${x0}, ${trackY})`)
      tipL.select('text').text(String(Math.round(sliderScale.invert(x0))))
    }).on('end', () => {
      const yy0 = Math.round(sliderScale.invert(Math.min(x0, x1)))
      const yy1 = Math.round(sliderScale.invert(Math.max(x0, x1)))
      const a = Math.max(totalMinYear, yy0)
      const b = Math.min(totalMaxYear, yy1)
      if (a !== yearDomain[0] || b !== yearDomain[1]) setYearDomain([a, b])
      tipL.style('display', 'none')
    })
    const dragRight = d3.drag().on('start', () => {
      tipR.style('display', null)
    }).on('drag', (event) => {
      x1 = clamp(event.x)
      if (x1 < x0) x1 = x0
      renderHandles()
      tipR.attr('transform', `translate(${x1}, ${trackY})`)
      tipR.select('text').text(String(Math.round(sliderScale.invert(x1))))
    }).on('end', () => {
      const yy0 = Math.round(sliderScale.invert(Math.min(x0, x1)))
      const yy1 = Math.round(sliderScale.invert(Math.max(x0, x1)))
      const a = Math.max(totalMinYear, yy0)
      const b = Math.min(totalMaxYear, yy1)
      if (a !== yearDomain[0] || b !== yearDomain[1]) setYearDomain([a, b])
      tipR.style('display', 'none')
    })

    handleL.call(dragLeft)
    handleR.call(dragRight)
    renderHandles()
  }, [grouped, mdbCodeById, selectedMdbIds, hiddenKeys, containerWidth, containerHeight, controlsHeight, selectedChartType, yearDomain])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[75vh] md:min-h-[calc(100dvh-40px)] rounded-xl border border-slate-200 bg-white shadow-sm p-3">
      <div className="absolute top-2 left-2 z-50" role="group" aria-label="Selector de tipo de gráfico">
        <div className="relative">
          <div className="mb-1 text-xs font-medium text-slate-600 bg-white/80 px-2 py-1 rounded">Tipo de Gráfico:</div>
          <button
            type="button"
            onClick={() => setShowChartTypePicker((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            aria-expanded={showChartTypePicker}
            aria-controls="chart-type-dropdown"
          >
            <span>{CHART_TYPES.find((c) => c.id === selectedChartType)?.label || ''}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.185l3.71-3.954a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0l-4.24-4.52a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {showChartTypePicker && (
            <div
              ref={chartTypeDropdownRef}
              id="chart-type-dropdown"
              className="absolute z-30 top-full left-0 mt-1 w-56 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
            >
              {CHART_TYPES.map((chartType) => (
                <button
                  key={chartType.id}
                  type="button"
                  onClick={() => {
                    setSelectedChartType(chartType.id)
                    setShowChartTypePicker(false)
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm ${
                    selectedChartType === chartType.id ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {chartType.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={controlsRef} className="relative mb-2">
        <div className="flex items-center justify-end gap-2">
          <label className="text-xs text-slate-600">Agregar MDB:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Seleccionar
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 opacity-70">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.185l3.71-3.954a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0l-4.24-4.52a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {showPicker && (
              <div
                ref={dropdownRef}
                className="absolute z-10 top-full right-0 mt-1 w-44 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
              >
                {addableMdbList.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-slate-500">No hay MDBs disponibles</div>
                ) : (
                  addableMdbList.map((m) => (
                    <button
                      key={m.mdb_id}
                      type="button"
                      onClick={() => {
                        setSelectedMdbIds((prev) => (prev.includes(m.mdb_id) ? prev : [...prev, m.mdb_id]))
                        setShowPicker(false)
                      }}
                      className="block w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {m.mdb_code || m.mdb_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        {legendEntries.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {legendEntries.map((entry) => {
              const isHidden = hiddenKeys.has(entry.key)
              return (
                <div
                  key={entry.key}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isHidden ? 'border-slate-200 text-slate-400' : 'border-slate-200 text-slate-600 shadow-sm'
                  }`}
                  style={{
                    borderColor: isHidden ? '#e2e8f0' : entry.color,
                    backgroundColor: isHidden ? 'rgba(255,255,255,0.85)' : `${entry.color}14`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSeriesVisibility(entry.key)}
                    className="flex items-center gap-2 text-xs font-medium text-inherit focus:outline-none"
                    aria-pressed={!isHidden}
                  >
                    <span className="inline-flex size-2.5 rounded-full" style={{ background: entry.color }} />
                    <span>{entry.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSeries(entry.key)}
                    className="inline-flex items-center justify-center rounded-full px-1 text-[11px] text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300"
                    aria-label={`Quitar ${entry.label}`}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="w-full flex-1 min-h-[600px] flex items-center justify-center text-slate-500">Cargando...</div>
      ) : error ? (
        <div className="w-full flex-1 min-h-[600px] flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <>
          <svg ref={svgRef} className="w-full" style={{ height: Math.max(620, Math.round((window.innerHeight || 900) * 0.74)) }} />
          <div className="mt-4 px-1 text-xs text-slate-500">
            {(() => {
              const info = sourceInfoFor(selectedChartType)
              if (!info) return null
              return (
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">Fuente:</span>
                  {info.url ? (
                    <a href={info.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">{info.label}</a>
                  ) : (
                    <span>{info.label}</span>
                  )}
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
