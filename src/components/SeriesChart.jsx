import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { Api, API_ERROR_MESSAGE, fetchJson } from '../lib/api.ts'
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

function toChartTypeMap(chartTypes) {
  if (!chartTypes) return {}
  if (Array.isArray(chartTypes)) {
    const obj = {}
    for (const ct of chartTypes) obj[ct.id] = ct
    return obj
  }
  return chartTypes
}

const DEFAULT_YEAR_FROM = 2000

export default function SeriesChart({ chartTypes, initialChartTypeId, initialSelectedMdbIds = [11, 13, 25, 29, 31], withArea = false, endpointPath = '/metric-values/' }) {
  const CHART_TYPES = useMemo(() => toChartTypeMap(chartTypes), [chartTypes])
  const chartTypeIds = useMemo(() => Object.keys(CHART_TYPES), [CHART_TYPES])
  const metricIdsForAll = useMemo(() => chartTypeIds.filter((id) => id !== '__all__'), [chartTypeIds])
  const defaultId = initialChartTypeId || chartTypeIds[0]

  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const controlsRef = useRef(null)
  const dropdownRef = useRef(null)
  const chartTypeDropdownRef = useRef(null)
  const clipPathIdRef = useRef(`clip-${Math.random().toString(36).slice(2, 9)}`)
  const { width: containerWidth, height: containerHeight } = useResizeObserver(containerRef)
  const { height: controlsHeight } = useResizeObserver(controlsRef)
  const location = useLocation()
  const navigate = useNavigate()

  const [data, setData] = useState([])
  const [mdbCodeById, setMdbCodeById] = useState(new Map())
  const [mdbList, setMdbList] = useState([])
  const [selectedMdbIds, setSelectedMdbIds] = useState(initialSelectedMdbIds)
  const [hiddenKeys, setHiddenKeys] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showChartTypePicker, setShowChartTypePicker] = useState(false)
  const [selectedChartType, setSelectedChartType] = useState(defaultId)
  const [yearDomain, setYearDomain] = useState(null) // [fromYear, toYear]
  const [yoyMode, setYoyMode] = useState(false)
  const [metricMetaById, setMetricMetaById] = useState(new Map())

  const chartsInAllMode = selectedChartType === '__all__' ? Math.max(1, metricIdsForAll.length) : 1
  const columnsInAllMode = chartsInAllMode > 1 ? 2 : 1
  const rowsInAllMode = selectedChartType === '__all__' ? Math.ceil(chartsInAllMode / columnsInAllMode) : 1
  const viewportHeight = typeof window === 'undefined' ? 800 : Number.isFinite(window.innerHeight) ? window.innerHeight : 800

  // Altura objetivo del SVG (más alta en gráfico individual, dinámica en "Ver todos")
  const desiredSvgHeight = selectedChartType === '__all__'
    ? Math.max(520, rowsInAllMode * 260 + 120)
    : Math.max(420, Math.round(viewportHeight * 0.68))

  const buildDisplayConfig = useCallback((metricId) => {
    const meta = CHART_TYPES[metricId] || {}
    const divisorRaw = meta.valueDivisor
    const overrideDivisor = divisorRaw == null ? null : Number(divisorRaw)
    const divisor = !yoyMode && Number.isFinite(overrideDivisor) && overrideDivisor !== 0 ? overrideDivisor : 1
    const axisDigitsRaw = meta.valueAxisDigits
    const tooltipDigitsRaw = meta.valueTooltipDigits
    const axisDigits = Number.isFinite(axisDigitsRaw) ? Math.max(0, Number(axisDigitsRaw)) : divisor !== 1 ? 0 : 2
    const tooltipDigits = Number.isFinite(tooltipDigitsRaw) ? Math.max(0, Number(tooltipDigitsRaw)) : divisor !== 1 ? 2 : 2
    const baseAxisSuffix = meta.valueAxisSuffix ?? meta.valueSuffix ?? ''
    const baseTooltipSuffix = meta.valueTooltipSuffix ?? meta.valueSuffix ?? ''
    const axisSuffix = !yoyMode && divisor !== 1 ? baseAxisSuffix || ' M USD' : (!yoyMode ? baseAxisSuffix : '')
    const tooltipSuffix = !yoyMode && divisor !== 1 ? baseTooltipSuffix || ' M USD' : (!yoyMode ? baseTooltipSuffix : '')
    const axisFormatter = d3.format(`,.${axisDigits}f`)
    const tooltipFormatter = d3.format(`,.${tooltipDigits}f`)
    return {
      divisor,
      formatAxis: (value) => `${axisFormatter(value)}${axisSuffix}`,
      formatTooltip: (value) => `${tooltipFormatter(value)}${tooltipSuffix}`,
    }
  }, [CHART_TYPES, yoyMode])

  const scaleSeriesWithConfig = (seriesArr, displayConfig) => {
    if (!Array.isArray(seriesArr) || !displayConfig || displayConfig.divisor === 1) return seriesArr
    return seriesArr.map((series) => ({
      ...series,
      values: series.values.map((point) => ({
        ...point,
        value: point.value == null ? null : point.value / displayConfig.divisor,
      })),
    }))
  }

  // Listas derivadas para el selector de MDBs según los datos cargados
  const availableMdbIds = useMemo(() => new Set((Array.isArray(data) ? data : []).map((d) => d.mdb_id)), [data])
  const availableMdbList = useMemo(() => mdbList.filter((m) => availableMdbIds.has(m.mdb_id)), [mdbList, availableMdbIds])
  const addableMdbList = useMemo(() => availableMdbList.filter((m) => !selectedMdbIds.includes(m.mdb_id)), [availableMdbList, selectedMdbIds])

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

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const metricIds = selectedChartType === '__all__'
          ? metricIdsForAll
          : [selectedChartType]

        const normalizedMetricIds = (metricIds || []).filter((id) => typeof id === 'string' && id.trim().length > 0)
        if (normalizedMetricIds.length === 0) {
          if (!cancelled) {
            setData([])
          }
          return
        }

        const sortedMetricIds = Array.from(new Set(normalizedMetricIds)).sort()
        const params = new URLSearchParams()
        sortedMetricIds.forEach((id) => params.append('metric_id', id))
        params.set('year_from', String(DEFAULT_YEAR_FROM))
        const queryString = params.toString()

        const [valuesRes, mdbsRes] = await Promise.all([
          fetchJson(`${endpointPath}?${queryString}`),
          Api.mdbs(),
        ])
        if (!cancelled) {
          setData(Array.isArray(valuesRes) ? valuesRes : [])
          const map = new Map((Array.isArray(mdbsRes) ? mdbsRes : []).map((m) => [m.mdb_id, m.mdb_code || String(m.mdb_id)]))
          setMdbCodeById(map)
          setMdbList(Array.isArray(mdbsRes) ? mdbsRes : [])
        }
      } catch (e) {
        console.error('Error loading series chart data', e)
        if (!cancelled) setError(API_ERROR_MESSAGE)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [endpointPath, metricIdsForAll, selectedChartType])

  // Cargar metadatos de métricas (incluye fuente)
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
        // ignorar fallo de metadatos; el gráfico sigue funcionando
      }
    }
    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  // Resolver info de fuente y URL a partir de metadatos
  const sourceInfoFor = (metricId) => {
    const meta = metricMetaById.get(metricId)
    const raw = (meta?.source || '').trim()
    if (!raw) return null
    const s = raw.toLowerCase()
    if (s.includes('mood')) {
      return { label: "Moody's", url: 'https://www.moodys.com' }
    }
    if (s.includes("s&p") || s.includes('spglobal') || s.includes('s&p global') || s.includes('standard & poor')) {
      return { label: 'S&P Global Market Intelligence', url: 'https://www.spglobal.com/market-intelligence/es' }
    }
    return { label: raw, url: null }
  }

  // Establecer dominio de años por defecto al cargar datos
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return
    const years = data.map((d) => Number(d.year)).filter((n) => Number.isFinite(n))
    if (years.length === 0) return
    const desiredStart = 2014
    const totalMinYear = d3.min(years)
    const totalMaxYear = d3.max(years)
    const safeMax = totalMaxYear ?? totalMinYear ?? desiredStart
    const startCandidate = Math.max(desiredStart, totalMinYear ?? safeMax)
    const clampedStart = Math.min(startCandidate, safeMax)
    const from = clampedStart
    const to = safeMax
    setYearDomain([from, to])
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
      values: values.filter((v) => v.value != null && Number.isFinite(v.value) && v.value !== 0).sort((a, b) => a.year - b.year),
    }))
  }, [data])

  useEffect(() => {
    const svgEl = svgRef.current
    const wrapEl = containerRef.current
    if (!svgEl || !wrapEl || !yearDomain) return

    const width = Math.max(320, containerWidth || wrapEl.clientWidth || 800)
    // Altura desacoplada del contenido para evitar loops de layout
    const height = desiredSvgHeight

    const labelAreaWidth = 96
    const sliderAreaHeight = 64
    const margin = {
      top: selectedChartType === '__all__' ? 40 : 32,
      right: 24 + labelAreaWidth,
      bottom: 28 + sliderAreaHeight,
      left: 56,
    }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3.select(svgEl)
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Definir área de clipping
    const clipId = clipPathIdRef.current
    g
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)

    // Grupo de trazado sujeto al clip
    const gPlot = g.append('g').attr('clip-path', `url(#${clipId})`)

    const selectedSet = new Set(selectedMdbIds)
    const modeAll = selectedChartType === '__all__'

    // Transformación a variación porcentual interanual (YoY)
    const toYoY = (arr) => {
      if (!Array.isArray(arr)) return []
      let prev = null
      const out = []
      for (const v of arr) {
        if (prev == null || prev.value == null || prev.value === 0) {
          out.push({ year: v.year, value: null })
        } else {
          out.push({ year: v.year, value: ((v.value - prev.value) / prev.value) * 100 })
        }
        prev = v
      }
      return out
    }

    // Preparar datos por métrica en modo "Ver todos"
    let charts = []
    if (modeAll) {
      const parsed = (Array.isArray(data) ? data : [])
        .map((d) => ({ metric_id: d.metric_id, mdb_id: d.mdb_id, year: Number(d.year), value: d.value == null ? null : Number(d.value) }))
        .filter((d) => Number.isFinite(d.year) && d.value != null && Number.isFinite(d.value) && d.value !== 0)
      const byMetric = d3.group(parsed, (d) => d.metric_id)
      const allMetricIds = metricIdsForAll
      charts = allMetricIds.map((metricId) => {
        const byMdb = d3.group(byMetric.get(metricId) || [], (d) => d.mdb_id)
        const series = Array.from(byMdb, ([mdbId, values]) => ({
          key: mdbId,
          seriesKey: `${mdbId}-${metricId}`,
          mdbId,
          label: mdbCodeById.get(mdbId) || String(mdbId),
          values: values.sort((a, b) => a.year - b.year),
        })).filter((s) => selectedSet.size === 0 || selectedSet.has(s.mdbId))
        return { metricId, series }
      })
    }

    // Modo normal (una sola métrica)
    const filteredGrouped = grouped.filter((s) => selectedSet.size === 0 || selectedSet.has(s.mdbId))
    const singleSeriesRaw = filteredGrouped.map((s) => ({ key: s.mdbId, label: mdbCodeById.get(s.mdbId) || String(s.mdbId), values: s.values }))
    const singleSeries = yoyMode ? singleSeriesRaw.map((s) => ({ ...s, values: toYoY(s.values) })) : singleSeriesRaw
    const singleDisplayConfig = buildDisplayConfig(selectedChartType)
    const singleSeriesScaled = scaleSeriesWithConfig(singleSeries, singleDisplayConfig)

    const chartsDisplayBase = yoyMode
      ? charts.map((c) => ({ ...c, series: c.series.map((s) => ({ ...s, values: toYoY(s.values) })) }))
      : charts

    const chartsWithConfig = chartsDisplayBase.map((c) => {
      const displayConfig = buildDisplayConfig(c.metricId)
      return {
        ...c,
        displayConfig,
        series: scaleSeriesWithConfig(c.series, displayConfig),
      }
    })

    const allYears = (modeAll ? chartsWithConfig.flatMap((c) => c.series) : singleSeriesScaled).flatMap((s) => s.values.map((d) => d.year))
    const allValues = (modeAll ? chartsWithConfig.flatMap((c) => c.series) : singleSeriesScaled).flatMap((s) => s.values.map((d) => d.value))

    const desiredMinYear = 2014
    const totalMinYearRaw = d3.min(allYears)
    const totalMaxYearRaw = d3.max(allYears)
    const fallbackYear = totalMaxYearRaw ?? totalMinYearRaw ?? desiredMinYear
    const totalMinYear = Math.min(Math.max(desiredMinYear, totalMinYearRaw ?? fallbackYear), fallbackYear)
    const totalMaxYear = Math.max(totalMinYear, totalMaxYearRaw ?? fallbackYear)

    let rangeStart = Math.max(totalMinYear, Math.min(totalMaxYear, yearDomain[0]))
    let rangeEnd = Math.max(totalMinYear, Math.min(totalMaxYear, yearDomain[1]))
    if (rangeStart > rangeEnd) [rangeStart, rangeEnd] = [rangeEnd, rangeStart]
    if (rangeStart !== yearDomain[0] || rangeEnd !== yearDomain[1]) {
      setYearDomain([rangeStart, rangeEnd])
    }
    const domainStart = rangeStart
    const domainEnd = rangeEnd

    const filterSeriesValues = (seriesArr) => seriesArr.map((s) => ({
      ...s,
      values: s.values.filter((v) => v.year >= domainStart && v.year <= domainEnd),
    }))

    const singleSeriesClipped = filterSeriesValues(singleSeriesScaled)
    const singleVisibleSeries = singleSeriesClipped.filter((s) => !hiddenKeys.has(s.key))
    const chartsDisplayClipped = chartsWithConfig
      .map((c) => ({
        ...c,
        series: filterSeriesValues(c.series),
      }))
      .filter((c) => c.series.some((s) => s.values.length > 0))

    const x = d3.scaleLinear().domain([domainStart, domainEnd]).range([0, innerWidth])
    const valuesInDomain = (modeAll ? chartsDisplayClipped.flatMap((c) => c.series) : singleVisibleSeries)
      .flatMap((s) => s.values.map((d) => d.value))
    const filteredExtentRaw = d3.extent(valuesInDomain.filter((v) => v != null && Number.isFinite(v)))
    const baseExtentRaw = d3.extent(allValues.filter((v) => v != null && Number.isFinite(v)))
    const fallbackExtent = (extent) => (extent[0] == null || extent[1] == null ? [0, 1] : extent)
    const filteredExtent = fallbackExtent(filteredExtentRaw)
    const baseExtent = fallbackExtent(baseExtentRaw)
    let yDomain = filteredExtentRaw[0] == null || filteredExtentRaw[1] == null ? baseExtent : filteredExtent
    if (yDomain[0] === yDomain[1]) {
      const center = yDomain[0] || 0
      const pad = Math.max(1, Math.abs(center) * 0.05)
      yDomain = [center - pad, center + pad]
    }
    // Add headroom at the top (10%)
    const ySpan = (yDomain[1] - yDomain[0]) || 1
    yDomain = [yDomain[0], yDomain[1] + ySpan * 0.1]
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0])

    // Colores fijos por código de MDB, con fallback a paleta por defecto (compartidos)
    const defaultColor = d3
      .scaleOrdinal(d3.schemeTableau10)
      .domain((modeAll ? chartsDisplayClipped.flatMap((c) => c.series) : singleSeriesScaled).map((s) => String(s.key)))
    const colorFor = (label, key) => colorForMdbCode(label, () => defaultColor(String(key)))

    const xAxis = d3.axisBottom(x).ticks(10).tickFormat((d) => String(Math.round(d)))
    const yAxis = d3.axisLeft(y).ticks(6)
    if (yoyMode) {
      const fmtTick = d3.format('+.0f')
      yAxis.tickFormat((d) => `${fmtTick(d)}%`)
    } else if (!modeAll && singleDisplayConfig?.formatAxis) {
      yAxis.tickFormat((d) => singleDisplayConfig.formatAxis(d))
    }

    if (!modeAll) {
      g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis)
      const yAxisG = g.append('g').call(yAxis)
      yAxisG.select('.domain').remove()
    }

    if (!modeAll) {
      const baseTitle = CHART_TYPES[selectedChartType]?.title || ''
      const titleText = yoyMode ? `${baseTitle} (Var % YoY)` : baseTitle
      g
        .append('text')
        .attr('x', innerWidth / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('fill', '#0f172a')
        .attr('font-weight', 600)
        .attr('font-size', 13)
        .text(titleText)
    }

    const line = d3
      .line()
      .defined((d) => d.value != null)
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    if (withArea && !modeAll) {
      const area = d3
        .area()
        .defined((d) => d.value != null)
        .x((d) => x(d.year))
        .y1((d) => y(d.value))
        .y0(innerHeight)
        .curve(d3.curveMonotoneX)

      gPlot
        .append('g')
        .selectAll('path')
        .data(singleSeriesClipped)
        .join('path')
        .attr('fill', (d) => colorFor(d.label, d.key))
        .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.06 : 0.12))
        .attr('d', (d) => area(d.values))
    }

    if (!modeAll) {
      gPlot
        .append('g')
        .selectAll('path')
        .data(singleSeriesClipped)
        .join('path')
        .attr('fill', 'none')
        .attr('stroke', (d) => colorFor(d.label, d.key))
        .attr('stroke-width', 2)
        .attr('d', (d) => line(d.values))
        .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.15 : 1))

      const singleLabelPosition = (series) => {
        const last = [...series.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        const baseX = last ? x(last.year) : innerWidth
        const baseY = last ? y(last.value) : y.range()[0]
        const clampedY = Math.max(0, Math.min(innerHeight, baseY))
        return {
          x: Math.min(innerWidth + 72, baseX + 12),
          y: clampedY,
        }
      }

      const labelLayer = g.append('g').attr('class', 'series-labels')
      const labelGroups = labelLayer
        .selectAll('g')
        .data(singleSeriesClipped, (d) => d.key)
        .join((enter) => {
          const gEnter = enter.append('g').attr('class', 'series-label')
          gEnter.append('text').attr('class', 'label-text')
          gEnter.append('text').attr('class', 'label-remove').text('×')
          return gEnter
        })
        .attr('transform', (d) => {
          const pos = singleLabelPosition(d)
          return `translate(${pos.x}, ${pos.y})`
        })
        .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.35 : 1))

      labelGroups
        .select('text.label-text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', (d) => colorFor(d.label, d.key))
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('alignment-baseline', 'middle')
        .attr('text-anchor', 'start')
        .style('cursor', 'pointer')
        .text((d) => d.label)
        .on('click', (_, d) => toggleSeriesVisibility(d.key))
        .append('title')
        .text('Alternar visibilidad de la serie')

      labelGroups
        .select('text.label-remove')
        .attr('fill', '#475569')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('alignment-baseline', 'middle')
        .attr('text-anchor', 'start')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation()
          removeSeries(d.key)
        })

      labelGroups.each(function () {
        const group = d3.select(this)
        const textNode = group.select('text.label-text').node()
        const removeNode = group.select('text.label-remove')
        const width = textNode?.getBBox().width ?? 0
        removeNode.attr('x', width + 6)
      })

      // Marcadores de puntos (pequeños pero visibles) para cada serie
      const pointsG = gPlot.append('g').attr('class', 'series-points')
      const seriesGroups = pointsG
        .selectAll('g.series')
        .data(singleSeriesClipped)
        .join('g')
        .attr('class', 'series')
        .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.15 : 1))

      seriesGroups
        .selectAll('circle')
        .data((s) => s.values
          .filter((v) => v.value != null && v.year >= domainStart && v.year <= domainEnd)
          .map((v) => ({ ...v, __series: s }))
        )
        .join('circle')
        .attr('cx', (d) => x(d.year))
        .attr('cy', (d) => y(d.value))
        .attr('r', 2.5)
        .attr('fill', '#ffffff')
        .attr('stroke', (d) => colorFor(d.__series.label, d.__series.key))
        .attr('stroke-width', 1.5)

      // Tooltips (restaurados para modo individual)
      const years = Array.from(new Set(singleSeriesClipped.flatMap((s) => s.values.map((d) => d.year)))).sort((a, b) => a - b)
      const bisect = d3.bisector((d) => d.year).left

      const markers = gPlot
        .append('g')
        .style('display', 'none')
        .selectAll('circle')
        .data(singleVisibleSeries)
        .join('circle')
        .attr('r', 6)
        .attr('fill', '#fff')
        .attr('stroke-width', 2)
        .attr('stroke', (d) => colorFor(d.label, d.key))

      const rule = gPlot
        .append('line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1)
        .style('display', 'none')

      const tooltipSel = d3
        .select(containerRef.current)
        .selectAll('div.chart-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('border', '1px solid #e2e8f0')
        .style('border-radius', '8px')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.08)')
        .style('padding', '8px 10px')
        .style('font-size', '12px')
        .style('color', '#0f172a')
        .style('z-index', '10')
        .style('display', 'none')

      const formatTooltipValue = yoyMode
        ? (value) => `${d3.format('+.2f')(value)}%`
        : (value) => (singleDisplayConfig?.formatTooltip ? singleDisplayConfig.formatTooltip(value) : d3.format(',.2f')(value))

      gPlot
        .append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mouseenter', () => {
          markers.style('display', null)
          rule.style('display', null)
          tooltipSel.style('display', 'block')
        })
        .on('mouseleave', () => {
          // Revertir resaltado de markers
          pointsG
            .selectAll('circle')
            .attr('r', 2.5)
            .attr('fill', '#ffffff')
            .attr('stroke-width', 1.5)
          markers.style('display', 'none')
          rule.style('display', 'none')
          tooltipSel.style('display', 'none')
        })
        .on('mousemove', (event) => {
          const [mx] = d3.pointer(event, gPlot.node())
          if (!Number.isFinite(mx)) return
          const xYear = x.invert(mx)
          let i = d3.bisectCenter(years, xYear)
          i = Math.max(0, Math.min(years.length - 1, i))
          const year0 = years[i]
          const sx = x(year0)
          rule.attr('x1', sx).attr('x2', sx)

          // Resaltar marker más cercano al año del tooltip
          pointsG
            .selectAll('circle')
            .attr('r', (d) => (d.year === year0 ? 4 : 2.5))
            .attr('fill', (d) => (d.year === year0 ? colorFor(d.__series.label, d.__series.key) : '#ffffff'))
            .attr('stroke-width', (d) => (d.year === year0 ? 2 : 1.5))

          const rows = []
          markers.each(function (s) {
            const arr = s.values
            if (!arr || arr.length === 0) {
              d3.select(this).style('display', 'none')
              return
            }
            let j = bisect(arr, year0)
            if (j >= arr.length) j = arr.length - 1
            if (j > 0 && Math.abs(arr[j].year - year0) > Math.abs(arr[j - 1].year - year0)) j = j - 1
            const pt = arr[j]
            if (!pt || pt.value == null) {
              d3.select(this).style('display', 'none')
              return
            }
            const cx = x(pt.year)
            const cy = y(pt.value)
            d3.select(this).style('display', null).attr('cx', cx).attr('cy', cy)
            rows.push({ label: s.label, color: colorFor(s.label, s.key), value: pt.value })
          })

          rows.sort((a, b) => d3.descending(a.value, b.value))

          const containerRect = containerRef.current.getBoundingClientRect()
          const svgRect = svgEl.getBoundingClientRect()
          const gx = margin.left + sx + svgRect.left - containerRect.left
          const left = Math.min(Math.max(gx + 12, 8), containerRect.width - 220)

          const cyValues = []
          markers.each(function () {
            const cy = d3.select(this).attr('cy')
            const num = cy == null ? NaN : Number(cy)
            if (Number.isFinite(num)) cyValues.push(num)
          })
          const anchorY = cyValues.length ? d3.mean(cyValues) : innerHeight / 2
          const gy = margin.top + anchorY + svgRect.top - containerRect.top
          const top = Math.max(8, Math.min(containerRect.height - 80, gy - 12))

          const html = [
            `<div style="font-weight:700;margin-bottom:6px;">Año: ${year0}</div>`,
            ...rows.map(
              (r) =>
                `<div style="display:flex;align-items:center;gap:6px;line-height:1.2;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${r.color};"></span>
                  <span style="min-width:60px;">${r.label}</span>
                  <span style="font-weight:600;">${formatTooltipValue(r.value)}</span>
                </div>`
            ),
          ].join('')

          tooltipSel
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('transform', `translateY(0)`) 
            .html(html)
        })
    } else {
      // Subgráficos en dos columnas balanceadas (modo "Ver todos")
      const subGap = 16
      const n = chartsDisplayClipped.length
      const cols = n > 1 ? 2 : 1
      const leftCount = cols === 2 ? Math.ceil(n / 2) : n
      const rightCount = cols === 2 ? Math.floor(n / 2) : 0
      const colWidth = cols === 2 ? (innerWidth - subGap) / 2 : innerWidth
      const rows = Math.max(leftCount, rightCount)
      const subWidth = colWidth
      const subHeight = (innerHeight - subGap * Math.max(0, rows - 1)) / Math.max(1, rows)
      const subMargin = { top: 44, right: 18, bottom: 34, left: 54 }

      const sharedTooltip = d3
        .select(containerRef.current)
        .selectAll('div.chart-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('border', '1px solid #e2e8f0')
        .style('border-radius', '8px')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.08)')
        .style('padding', '8px 10px')
        .style('font-size', '12px')
        .style('color', '#0f172a')
        .style('z-index', '10')
        .style('display', 'none')

      chartsDisplayClipped.forEach((chart, idx) => {
        if (!chart.series || chart.series.length === 0) return

        const col = cols === 2 && idx >= leftCount ? 1 : 0
        const row = col === 0 ? idx : idx - leftCount
        const xOffset = col * (colWidth + subGap)
        const yOffset = row * (subHeight + subGap)

        const subInnerWidth = subWidth - subMargin.left - subMargin.right
        const subInnerHeight = subHeight - subMargin.top - subMargin.bottom
        if (subInnerWidth <= 0 || subInnerHeight <= 0) return

        const subRoot = gPlot.append('g').attr('transform', `translate(${xOffset},${yOffset})`)
        const sub = subRoot.append('g').attr('transform', `translate(${subMargin.left},${subMargin.top})`)
        const displayConfig = chart.displayConfig

        const subClipId = `subclip-${idx}-${clipPathIdRef.current}`
        g
          .append('clipPath')
          .attr('id', subClipId)
          .append('rect')
          .attr('width', subInnerWidth)
          .attr('height', subInnerHeight)

        const subPlot = sub.append('g').attr('clip-path', `url(#${subClipId})`)

        const seriesForChart = chart.series
        const subFirstYears = seriesForChart.map((s) => (s.values.length ? s.values[0].year : Infinity))
        const subLastYears = seriesForChart.map((s) => (s.values.length ? s.values[s.values.length - 1].year : -Infinity))
        const subMinFirst = d3.min(subFirstYears)
        const subMaxLast = d3.max(subLastYears)
        const xMinSub = subMinFirst == null || !Number.isFinite(subMinFirst) ? domainStart : Math.max(domainStart, subMinFirst)
        const xMaxSub = subMaxLast == null || !Number.isFinite(subMaxLast) ? domainEnd : Math.min(domainEnd, subMaxLast)

        const xSub = d3.scaleLinear().domain([xMinSub, xMaxSub]).range([0, subInnerWidth])

        const extentVals = seriesForChart
          .flatMap((s) => s.values.map((v) => v.value))
          .filter((v) => v != null && Number.isFinite(v))
        let safeDomain = extentVals.length ? d3.extent(extentVals) : [0, 1]
        if (safeDomain[0] == null || safeDomain[1] == null) safeDomain = [0, 1]
        if (safeDomain[0] === safeDomain[1]) {
          const center = safeDomain[0] || 0
          safeDomain = [center - 1, center + 1]
        }
        // Add headroom at the top (10%)
        const subSpan = (safeDomain[1] - safeDomain[0]) || 1
        safeDomain = [safeDomain[0], safeDomain[1] + subSpan * 0.1]

        const ySub = d3.scaleLinear().domain(safeDomain).nice().range([subInnerHeight, 0])

        if (withArea) {
          const area = d3
            .area()
            .defined((d) => d.value != null)
            .x((d) => xSub(d.year))
            .y1((d) => ySub(d.value))
            .y0(subInnerHeight)
            .curve(d3.curveMonotoneX)

          subPlot
            .append('g')
            .selectAll('path.area')
            .data(seriesForChart, (s) => s.seriesKey)
            .join('path')
            .attr('class', 'area')
            .attr('fill', (d) => colorFor(d.label, d.key))
            .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.06 : 0.12))
            .attr('d', (d) => area(d.values))
        }

        const lineSub = d3
          .line()
          .defined((d) => d.value != null)
          .x((d) => xSub(d.year))
          .y((d) => ySub(d.value))
          .curve(d3.curveMonotoneX)

        subPlot
          .append('g')
          .selectAll('path.series')
          .data(seriesForChart, (s) => s.seriesKey)
          .join('path')
          .attr('class', 'series')
          .attr('fill', 'none')
          .attr('stroke', (d) => colorFor(d.label, d.key))
          .attr('stroke-width', 1.5)
          .attr('d', (d) => lineSub(d.values))
          .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.18 : 1))

        const subPointsG = subPlot.append('g').attr('class', 'series-points')
        const subSeriesGroups = subPointsG
          .selectAll('g.series')
          .data(seriesForChart, (s) => s.seriesKey)
          .join('g')
          .attr('class', 'series')
          .attr('opacity', (d) => (hiddenKeys.has(d.key) ? 0.2 : 1))

        subSeriesGroups
          .selectAll('circle')
          .data((s) =>
            s.values
              .filter((v) => v.value != null && v.year >= xMinSub && v.year <= xMaxSub)
              .map((v) => ({ ...v, __series: s }))
          )
          .join('circle')
          .attr('cx', (d) => xSub(d.year))
          .attr('cy', (d) => ySub(d.value))
          .attr('r', 2.4)
          .attr('fill', '#ffffff')
          .attr('stroke', (d) => colorFor(d.__series.label, d.__series.key))
          .attr('stroke-width', 1.2)

        const years = Array.from(new Set(seriesForChart.flatMap((s) => s.values.map((v) => v.year)))).sort((a, b) => a - b)
        const bisect = d3.bisector((d) => d).left

        const rule = subPlot
          .append('line')
          .attr('y1', 0)
          .attr('y2', subInnerHeight)
          .attr('stroke', '#94a3b8')
          .attr('stroke-dasharray', '3,3')
          .attr('stroke-width', 1)
          .style('display', 'none')

        const formatTooltipValue = yoyMode
          ? (value) => `${d3.format('+.2f')(value)}%`
          : (value) => (displayConfig?.formatTooltip ? displayConfig.formatTooltip(value) : d3.format(',.2f')(value))

        subPlot
          .append('rect')
          .attr('width', subInnerWidth)
          .attr('height', subInnerHeight)
          .attr('fill', 'transparent')
          .style('cursor', 'crosshair')
          .on('mouseenter', () => {
            if (years.length) {
              rule.style('display', null)
              sharedTooltip.style('display', 'block')
            }
          })
          .on('mouseleave', () => {
            rule.style('display', 'none')
            sharedTooltip.style('display', 'none')
            subPointsG
              .selectAll('circle')
              .attr('r', 2.4)
              .attr('fill', '#ffffff')
              .attr('stroke-width', 1.2)
          })
          .on('mousemove', (event) => {
            if (!years.length) return
            const [mx] = d3.pointer(event, subPlot.node())
            if (!Number.isFinite(mx)) return
            const xYear = xSub.invert(mx)
            let i = d3.bisectCenter(years, xYear)
            i = Math.max(0, Math.min(years.length - 1, i))
            const year0 = years[i]
            const sx = xSub(year0)
            rule.attr('x1', sx).attr('x2', sx)

            subPointsG
              .selectAll('circle')
              .attr('r', (d) => (d.year === year0 ? 3.6 : 2.4))
              .attr('fill', (d) => (d.year === year0 ? colorFor(d.__series.label, d.__series.key) : '#ffffff'))
              .attr('stroke-width', (d) => (d.year === year0 ? 1.6 : 1.2))

            const rowsData = []
            for (const s of seriesForChart) {
              const arr = s.values
              if (!arr || arr.length === 0) continue
              let j = bisect(arr.map((v) => v.year), year0)
              if (j >= arr.length) j = arr.length - 1
              if (j > 0 && Math.abs(arr[j].year - year0) > Math.abs(arr[j - 1].year - year0)) j = j - 1
              const pt = arr[j]
              if (!pt || pt.value == null) continue
              rowsData.push({ label: s.label, color: colorFor(s.label, s.key), value: pt.value })
            }

            if (!rowsData.length) {
              sharedTooltip.style('display', 'none')
              return
            }

            rowsData.sort((a, b) => d3.descending(a.value, b.value))

            const html = [
              `<div style="font-weight:700;margin-bottom:6px;">Año: ${year0}</div>`,
              ...rowsData.map(
                (r) =>
                  `<div style="display:flex;align-items:center;gap:6px;line-height:1.2;">
                     <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${r.color};"></span>
                     <span style="min-width:60px;">${r.label}</span>
                     <span style="font-weight:600;">${formatTooltipValue(r.value)}</span>
                   </div>`
              ),
            ].join('')

            const containerRect = containerRef.current.getBoundingClientRect()
            const svgRect = svgEl.getBoundingClientRect()
            const gx = margin.left + xOffset + subMargin.left + sx + svgRect.left - containerRect.left
            const left = Math.min(Math.max(gx + 12, 8), containerRect.width - 220)

            const yValues = rowsData.map((r) => ySub(r.value)).filter((v) => Number.isFinite(v))
            const anchorY = yValues.length ? d3.mean(yValues) : subInnerHeight / 2
            const gy = margin.top + yOffset + subMargin.top + anchorY + svgRect.top - containerRect.top
            const top = Math.max(8, Math.min(containerRect.height - 80, gy - 12))

            sharedTooltip
              .style('display', 'block')
              .style('left', `${left}px`)
              .style('top', `${top}px`)
              .style('transform', 'translateY(0)')
              .html(html)
          })

        const titleText = yoyMode
          ? `${CHART_TYPES[chart.metricId]?.title || chart.metricId} (Var % YoY)`
          : CHART_TYPES[chart.metricId]?.title || chart.metricId

        subRoot
          .append('text')
          .attr('x', subWidth / 2)
          .attr('y', Math.max(16, subMargin.top / 2))
          .attr('fill', '#0f172a')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .attr('text-anchor', 'middle')
          .text(titleText)

        const yAxisSub = d3.axisLeft(ySub).ticks(3)
        if (yoyMode) {
          const fmt = d3.format('+.0f')
          yAxisSub.tickFormat((d) => `${fmt(d)}%`)
        } else if (displayConfig?.formatAxis) {
          yAxisSub.tickFormat((d) => displayConfig.formatAxis(d))
        }
        sub.append('g').call(yAxisSub).select('.domain').remove()

        const isBottomOfCol = (col === 0 && row === leftCount - 1) || (col === 1 && row === rightCount - 1)
        if (isBottomOfCol) {
          const xAxisSub = d3.axisBottom(xSub).ticks(4).tickFormat((d) => String(Math.round(d)))
          sub.append('g').attr('transform', `translate(0,${subInnerHeight})`).call(xAxisSub).select('.domain').attr('opacity', 1)
        }
      })
    }

    // En modo normal ya se agregó interacción/tooltip más arriba

    // Slider de años estilizado (fuera del área del gráfico)
    const sliderG = g.append('g').attr('transform', `translate(0, ${innerHeight + 32})`)
    const sliderPadding = 10
    const sliderScale = d3.scaleLinear().domain([totalMinYear, totalMaxYear]).range([sliderPadding, innerWidth - sliderPadding])

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

    // Barra de selección (color personalizado)
    const selectionBar = sliderG
      .append('rect')
      .attr('y', trackY - 3)
      .attr('height', 6)
      .attr('fill', '#e9ecef')

    // Manijas personalizadas con etiqueta
    const handlesG = sliderG.append('g').attr('class', 'handles')
    const handle = (cls) => {
      const gH = handlesG.append('g').attr('class', cls)
      gH
        .append('circle')
        .attr('r', 8)
        .attr('fill', '#111827')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 2)
      return gH
    }
    const handleL = handle('handle-left')
    const handleR = handle('handle-right')
    handlesG.raise()

    // Tooltips temporales (hacia abajo) durante el arrastre
    const tipsG = sliderG.append('g').attr('class', 'slider-tips')
    const makeTip = () => {
      const gT = tipsG.append('g').style('display', 'none')
      gT
        .append('rect')
        .attr('x', -22)
        .attr('y', 18)
        .attr('width', 44)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', '#ffffff')
        .attr('stroke', '#e2e8f0')
      gT
        .append('text')
        .attr('x', 0)
        .attr('y', 27)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#0f172a')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .text('')
      return gT
    }
    const tipL = makeTip()
    const tipR = makeTip()

    // Quitar eje del slider (sin etiquetas)

    // Estado interno para posiciones actuales
    // Posicionar manijas según el rango actualmente seleccionado
    let x0 = sliderScale(domainStart)
    let x1 = sliderScale(domainEnd)

    // Render helpers
    const renderHandles = () => {
      selectionBar.attr('x', Math.min(x0, x1)).attr('width', Math.max(0, Math.abs(x1 - x0)))
      handleL.attr('transform', `translate(${x0}, ${trackY})`)
      handleR.attr('transform', `translate(${x1}, ${trackY})`)
      handleL.style('display', null)
      handleR.style('display', null)
    }

    // Drag solo en manijas
    const clamp = (x) => Math.max(sliderPadding, Math.min(innerWidth - sliderPadding, x))
    const dragLeft = d3.drag().on('start', () => {
      tipL.style('display', null)
    }).on('drag', (event) => {
      x0 = clamp(event.x)
      if (x0 > x1) x0 = x1
      renderHandles()
      tipL.attr('transform', `translate(${x0}, ${trackY})`)
      tipL.select('text').text(String(Math.round(sliderScale.invert(x0))))
    }).on('end', () => {
      // Desde este año hasta el máximo
      const yy0 = Math.round(sliderScale.invert(x0))
      const a = Math.max(totalMinYear, yy0)
      if (a !== yearDomain[0] || totalMaxYear !== yearDomain[1]) setYearDomain([a, totalMaxYear])
      // extender visualmente selección a la derecha completa
      x1 = sliderScale(totalMaxYear)
      renderHandles()
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
      // Hasta este año desde el mínimo
      const yy1 = Math.round(sliderScale.invert(x1))
      const b = Math.min(totalMaxYear, yy1)
      if (totalMinYear !== yearDomain[0] || b !== yearDomain[1]) setYearDomain([totalMinYear, b])
      // extender visualmente selección a la izquierda completa
      x0 = sliderScale(totalMinYear)
      renderHandles()
      tipR.style('display', 'none')
    })

    handleL.call(dragLeft)
    handleR.call(dragRight)

    // Posición inicial
    renderHandles()
  }, [
    grouped,
    data,
    mdbCodeById,
    selectedMdbIds,
    hiddenKeys,
    containerWidth,
    containerHeight,
    controlsHeight,
    selectedChartType,
    yearDomain,
    yoyMode,
    metricIdsForAll,
    buildDisplayConfig,
    removeSeries,
    toggleSeriesVisibility,
    withArea,
    desiredSvgHeight,
    CHART_TYPES,
  ])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] rounded-xl border border-slate-200 bg-white shadow-sm p-3">
      {/* Selector de tipo de gráfico en la esquina superior izquierda */}
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
            <span>{CHART_TYPES[selectedChartType]?.label || ''}</span>
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
              {Object.values(CHART_TYPES).map((chartType) => (
                <button
                  key={chartType.id}
                  type="button"
                  onClick={() => {
                    setSelectedChartType(chartType.id)
                    setShowChartTypePicker(false)
                    if (chartType.id === '__all__') {
                      navigate({ pathname: location.pathname, search: '?all=1' }, { replace: true })
                    } else {
                      navigate({ pathname: location.pathname, search: '' }, { replace: true })
                    }
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

      {/* Controles alineados arriba: selector de MDBs a la derecha */}
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
        <div className="flex items-center justify-end gap-2 mt-2">
          <label className="text-xs text-slate-600">Var %:</label>
          <button
            type="button"
            onClick={() => setYoyMode((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 ${
              yoyMode ? 'border-primary bg-primary text-white focus:ring-primary/50' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-primary/50'
            }`}
            aria-pressed={yoyMode}
            aria-label="Alternar variación porcentual interanual"
          >
            {yoyMode ? 'Activado' : 'Desactivado'}
          </button>
        </div>
        {selectedChartType === '__all__' && legendEntries.length > 0 && (
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
                    backgroundColor: isHidden ? 'rgba(255,255,255,0.8)' : `${entry.color}14`,
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
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-slate-500">Cargando...</div>
      ) : error ? (
        <div className="w-full flex-1 min-h-[420px] flex items-center justify-center text-red-600">{error}</div>
      ) : (
        <>
          <svg ref={svgRef} className="w-full" style={{ height: desiredSvgHeight }} />
          <div className={selectedChartType === '__all__' ? 'mt-2 px-1 text-xs text-slate-500' : 'mt-4 px-1 text-xs text-slate-500'}>
            {selectedChartType === '__all__' ? (
              (() => {
                const ids = Object.keys(CHART_TYPES).filter((id) => id !== '__all__')
                const infos = ids.map((id) => sourceInfoFor(id)).filter(Boolean)
                const unique = []
                const seen = new Set()
                for (const inf of infos) {
                  const key = `${inf.label}|${inf.url || ''}`
                  if (!seen.has(key)) { seen.add(key); unique.push(inf) }
                }
                if (unique.length === 0) return null
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600">Fuente:</span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {unique.map((inf, idx) => (
                        <>
                          {inf.url ? (
                            <a key={`src-${idx}`} href={inf.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">{inf.label}</a>
                          ) : (
                            <span key={`src-${idx}`}>{inf.label}</span>
                          )}
                          {idx < unique.length - 1 && <span className="text-slate-400" key={`sep-${idx}`}>·</span>}
                        </>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : (
              (() => {
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
              })()
            )}
          </div>
        </>
      )}
    </div>
  )
}
