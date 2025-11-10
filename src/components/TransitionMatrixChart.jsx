import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'

const CATEGORIES = [
  { key: 'upgraded', label: 'Upgraded', color: '#15803d' },
  { key: 'noChange', label: 'No Change', color: '#cbd5e1' },
  { key: 'downgraded', label: 'Downgraded', color: '#f87171' },
  { key: 'defaulted', label: 'Defaulted', color: '#111827' },
  { key: 'withdrawn', label: 'Withdrawn', color: '#60a5fa' },
]

const TIMEFRAMES = {
  '1Y': {
    id: '1Y',
    label: '1 Año',
    data: [
      { rating: 'Aa1', gap: '>=6', observation: 729, upgraded: 0.1756, noChange: 0.7119, downgraded: 0.1070, defaulted: 0, withdrawn: 0.0055 },
      { rating: 'Aa2', gap: '5', observation: 1162, upgraded: 0.1454, noChange: 0.8133, downgraded: 0.0404, defaulted: 0, withdrawn: 0.0009 },
      { rating: 'Aa3', gap: '4', observation: 1794, upgraded: 0.1137, noChange: 0.8467, downgraded: 0.0368, defaulted: 0, withdrawn: 0.0028 },
      { rating: 'A1', gap: '3', observation: 3277, upgraded: 0.0970, noChange: 0.8554, downgraded: 0.0470, defaulted: 0, withdrawn: 0.0006 },
      { rating: 'A2', gap: '2', observation: 6725, upgraded: 0.0889, noChange: 0.8656, downgraded: 0.0454, defaulted: 0, withdrawn: 0.0001 },
      { rating: 'A3', gap: '1', observation: 12543, upgraded: 0.0782, noChange: 0.8705, downgraded: 0.0501, defaulted: 0, withdrawn: 0.0011 },
      { rating: 'Baa1', gap: '0', observation: 16535, upgraded: 0.0643, noChange: 0.8726, downgraded: 0.0628, defaulted: 0, withdrawn: 0.0003 },
      { rating: 'Baa2', gap: '-1', observation: 16086, upgraded: 0.0539, noChange: 0.8624, downgraded: 0.0832, defaulted: 0, withdrawn: 0.0006 },
      { rating: 'Baa3', gap: '-2', observation: 11798, upgraded: 0.0551, noChange: 0.8439, downgraded: 0.0985, defaulted: 0.0002, withdrawn: 0.0024 },
      { rating: 'Ba1', gap: '-3', observation: 6260, upgraded: 0.0474, noChange: 0.8064, downgraded: 0.1452, defaulted: 0.0002, withdrawn: 0.0008 },
      { rating: 'Ba2', gap: '-4', observation: 1872, upgraded: 0.0502, noChange: 0.7399, downgraded: 0.2099, defaulted: 0, withdrawn: 0 },
      { rating: 'Ba3', gap: '-5', observation: 746, upgraded: 0.0416, noChange: 0.7172, downgraded: 0.2413, defaulted: 0, withdrawn: 0 },
      { rating: 'B1', gap: '<=-6', observation: 803, upgraded: 0.0448, noChange: 0.5654, downgraded: 0.3773, defaulted: 0.0125, withdrawn: 0 },
    ],
  },
  '3Y': {
    id: '3Y',
    label: '3 Años',
    data: [
      { rating: 'Aa1', gap: '>=6', observation: 546, upgraded: 0.3150, noChange: 0.4121, downgraded: 0.2601, defaulted: 0, withdrawn: 0.0128 },
      { rating: 'Aa2', gap: '5', observation: 935, upgraded: 0.2684, noChange: 0.5743, downgraded: 0.1487, defaulted: 0, withdrawn: 0.0086 },
      { rating: 'Aa3', gap: '4', observation: 1559, upgraded: 0.2585, noChange: 0.5869, downgraded: 0.1411, defaulted: 0, withdrawn: 0.0135 },
      { rating: 'A1', gap: '3', observation: 2766, upgraded: 0.2278, noChange: 0.6171, downgraded: 0.1533, defaulted: 0, withdrawn: 0.0018 },
      { rating: 'A2', gap: '2', observation: 5549, upgraded: 0.2069, noChange: 0.6468, downgraded: 0.1442, defaulted: 0, withdrawn: 0.0022 },
      { rating: 'A3', gap: '1', observation: 10695, upgraded: 0.1742, noChange: 0.6636, downgraded: 0.1612, defaulted: 0, withdrawn: 0.0010 },
      { rating: 'Baa1', gap: '0', observation: 13711, upgraded: 0.1491, noChange: 0.6770, downgraded: 0.1727, defaulted: 0.0001, withdrawn: 0.0011 },
      { rating: 'Baa2', gap: '-1', observation: 12869, upgraded: 0.1430, noChange: 0.6565, downgraded: 0.1974, defaulted: 0, withdrawn: 0.0031 },
      { rating: 'Baa3', gap: '-2', observation: 9149, upgraded: 0.1323, noChange: 0.6444, downgraded: 0.2173, defaulted: 0.0010, withdrawn: 0.0050 },
      { rating: 'Ba1', gap: '-3', observation: 4613, upgraded: 0.1253, noChange: 0.5662, downgraded: 0.3048, defaulted: 0.0002, withdrawn: 0.0035 },
      { rating: 'Ba2', gap: '-4', observation: 1317, upgraded: 0.1139, noChange: 0.5027, downgraded: 0.3774, defaulted: 0.0008, withdrawn: 0.0053 },
      { rating: 'Ba3', gap: '-5', observation: 512, upgraded: 0.1465, noChange: 0.4043, downgraded: 0.4492, defaulted: 0, withdrawn: 0 },
      { rating: 'B1', gap: '<=-6', observation: 543, upgraded: 0.0737, noChange: 0.3352, downgraded: 0.5838, defaulted: 0.0074, withdrawn: 0 },
    ],
  },
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

export default function TransitionMatrixChart() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const { width: containerWidth } = useResizeObserver(containerRef)
  const [selectedFrame, setSelectedFrame] = useState('1Y')

  const timeframe = TIMEFRAMES[selectedFrame] || TIMEFRAMES['1Y']

  const stackedData = useMemo(() => {
    const data = timeframe.data
    const stackGenerator = d3.stack().keys(CATEGORIES.map((c) => c.key))
    return stackGenerator(data).map((layer, idx) => ({
      category: CATEGORIES[idx],
      segments: layer.map(([x0, x1], i) => ({
        x0,
        x1,
        datum: data[i],
      })),
    }))
  }, [timeframe])

  const yDomain = useMemo(() => timeframe.data.map((d) => d.rating), [timeframe])

  useEffect(() => {
    const svgEl = svgRef.current
    const tooltipEl = tooltipRef.current
    const containerEl = containerRef.current
    if (!svgEl || !containerEl) {
      if (tooltipEl) tooltipEl.style.display = 'none'
      return
    }

    const width = Math.max(520, containerWidth || containerEl.clientWidth || 720)
    const margin = { top: 56, right: 112, bottom: 48, left: 120 }
    const rowHeight = 28
    const innerWidth = width - margin.left - margin.right
    const innerHeight = timeframe.data.length * rowHeight
    const legendItemWidth = 140
    const legendItemHeight = 20
    const legendRowSpacing = 12
    const legendOffset = 28
    const itemsPerRow = Math.max(1, Math.floor(innerWidth / legendItemWidth))
    const legendRows = Math.ceil(CATEGORIES.length / itemsPerRow)
    const legendHeight = legendRows * legendItemHeight + (legendRows - 1) * legendRowSpacing
    const height = Math.max(420, margin.top + innerHeight + legendOffset + legendHeight + margin.bottom)

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth])
    const y = d3.scaleBand().domain(yDomain).range([0, innerHeight]).paddingInner(0.25).paddingOuter(0.1)

    const xAxis = d3
      .axisTop(x)
      .ticks(8)
      .tickFormat((d) => `${Math.round(d * 100)}%`)

    g.append('g')
      .attr('class', 'x-axis')
      .call(xAxis)
      .call((axis) => axis.selectAll('text').attr('fill', '#475569').attr('font-size', 11))
      .call((axis) => axis.select('path').attr('stroke', '#cbd5e1'))
      .call((axis) => axis.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '2,2'))

    const yAxis = d3
      .axisLeft(y)
      .tickSize(0)
      .tickPadding(12)

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call((axis) => axis.selectAll('text').attr('fill', '#1f2937').attr('font-size', 12).attr('font-weight', 600))
      .call((axis) => axis.selectAll('line').remove())
      .select('.domain')
      .remove()

    const dividerLines = g
      .append('g')
      .attr('class', 'divider-lines')
      .selectAll('line')
      .data(timeframe.data)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d.rating) + y.bandwidth())
      .attr('y2', (d) => y(d.rating) + y.bandwidth())
      .attr('stroke', '#f1f5f9')

    dividerLines.lower()

    const barHeight = Math.min(y.bandwidth(), Math.max(10, y.bandwidth() * 0.8))
    const bandOffset = (y.bandwidth() - barHeight) / 2

    const layerGroups = g
      .selectAll('.layer')
      .data(stackedData)
      .join('g')
      .attr('class', 'layer')
      .attr('fill', (d) => d.category.color)

    const allRects = layerGroups
      .selectAll('rect')
      .data((d) => d.segments)
      .join('rect')
      .attr('x', (d) => x(d.x0))
      .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0)))
      .attr('y', (d) => (y(d.datum.rating) || 0) + bandOffset)
      .attr('height', barHeight)
      .attr('rx', 2)
      .attr('ry', 2)
      .style('cursor', 'pointer')

    const focusOutline = g
      .append('rect')
      .attr('fill', 'none')
      .attr('stroke', '#1d4ed8')
      .attr('stroke-width', 1.5)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('display', 'none')

    const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
    const percentFormatter = (value) => `${formatter.format(value * 100)}%`
    const observationFormatter = new Intl.NumberFormat('es-AR')

    const handleMouseMove = (event, segment) => {
      if (!tooltipEl) return
      const { datum } = segment
      const layerCategory = d3.select(event.currentTarget.parentNode).datum().category
      const share = segment.x1 - segment.x0

      if (share <= 0) return

      focusOutline
        .style('display', null)
        .attr('x', x(segment.x0))
        .attr('y', (y(datum.rating) || 0) + bandOffset)
        .attr('width', Math.max(0, x(segment.x1) - x(segment.x0)))
        .attr('height', barHeight)

      tooltipEl.style.display = 'block'
      tooltipEl.innerHTML = `
        <div class="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Market Implied Rating ${datum.rating}</div>
        <div class="text-[12px] text-slate-700 mb-1"><span class="font-medium text-slate-900">${layerCategory.label}</span> · ${percentFormatter(share)}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span>Gap:</span><span class="text-right font-medium text-slate-700">${datum.gap}</span>
          <span>Observaciones:</span><span class="text-right font-medium text-slate-700">${observationFormatter.format(datum.observation)}</span>
        </div>
      `

      const padding = 16
      const tooltipWidth = tooltipEl.offsetWidth || 200
      const tooltipHeight = tooltipEl.offsetHeight || 120
      const offsetX = margin.left + x(segment.x1)
      const offsetY = margin.top + (y(datum.rating) || 0) + bandOffset + barHeight / 2

      let tooltipLeft = offsetX + padding
      if (tooltipLeft + tooltipWidth > width) {
        tooltipLeft = margin.left + x(segment.x0) - tooltipWidth - padding
      }
      tooltipLeft = Math.max(8, tooltipLeft)

      let tooltipTop = offsetY - tooltipHeight / 2 + y.bandwidth() / 2
      tooltipTop = Math.max(8, Math.min(tooltipTop, height - tooltipHeight - 8))

      tooltipEl.style.left = `${tooltipLeft}px`
      tooltipEl.style.top = `${tooltipTop}px`
    }

    const handleMouseLeave = () => {
      if (!tooltipEl) return
      tooltipEl.style.display = 'none'
      focusOutline.style('display', 'none')
    }

    allRects.on('mousemove', handleMouseMove).on('mouseleave', handleMouseLeave)

    g
      .selectAll('.gap-text')
      .data(timeframe.data)
      .join('text')
      .attr('class', 'gap-text')
      .attr('x', innerWidth + 48)
      .attr('y', (d) => (y(d.rating) || 0) + bandOffset + barHeight / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1f2937')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .text((d) => d.gap)

    g
      .append('text')
      .attr('x', innerWidth + 48)
      .attr('y', -24)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .text('Gap')

    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0, ${innerHeight + legendOffset})`)

    const legendItems = legend
      .selectAll('g')
      .data(CATEGORIES)
      .join('g')
      .attr('transform', (_, index) => {
        const row = Math.floor(index / itemsPerRow)
        const col = index % itemsPerRow
        return `translate(${col * legendItemWidth}, ${row * (legendItemHeight + legendRowSpacing)})`
      })

    legendItems
      .append('rect')
      .attr('width', 14)
      .attr('height', 14)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', (d) => d.color)

    legendItems
      .append('text')
      .attr('x', 20)
      .attr('y', 11)
      .attr('fill', '#475569')
      .attr('font-size', 12)
      .text((d) => d.label)

  }, [containerWidth, stackedData, timeframe, yDomain])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] rounded-xl border border-slate-200 bg-white shadow-sm p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Matriz de transición</p>
          <p className="text-sm text-slate-600">Trayectoria histórica del Market Implied Rating por horizonte.</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.values(TIMEFRAMES).map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => setSelectedFrame(frame.id)}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                frame.id === selectedFrame
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {frame.label}
            </button>
          ))}
      </div>
    </div>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Matriz de transición por Market Implied Rating" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
        style={{ minWidth: '200px' }}
      />
      <div className="mt-4 text-xs text-slate-500">Fuente: Moody&apos;s Market Implied Ratings. Cálculos internos.</div>
    </div>
  )
}
