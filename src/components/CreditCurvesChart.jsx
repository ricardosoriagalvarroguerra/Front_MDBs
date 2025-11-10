import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'

const RATINGS = ['Aaa', 'A2', 'Aa3', 'Aa1', 'Aa2']

const MATURITY_ROWS = [
  { maturity: 1, Aaa: 12, Aa1: 15, Aa2: 16, Aa3: 20, A1: 24, A2: 31, A3: 35, Baa1: 40, Baa2: 46, Baa3: 66, Ba1: 96, Ba2: 141, Ba3: 164, B1: 222, B2: 259, B3: 305 },
  { maturity: 2, Aaa: 28, Aa1: 33, Aa2: 36, Aa3: 41, A1: 47, A2: 56, A3: 62, Baa1: 69, Baa2: 77, Baa3: 102, Ba1: 137, Ba2: 187, Ba3: 209, B1: 261, B2: 310, B3: 367 },
  { maturity: 3, Aaa: 35, Aa1: 43, Aa2: 47, Aa3: 52, A1: 60, A2: 70, A3: 77, Baa1: 86, Baa2: 96, Baa3: 124, Ba1: 162, Ba2: 214, Ba3: 235, B1: 282, B2: 339, B3: 404 },
  { maturity: 4, Aaa: 41, Aa1: 51, Aa2: 56, Aa3: 62, A1: 71, A2: 82, A3: 90, Baa1: 100, Baa2: 112, Baa3: 142, Ba1: 182, Ba2: 236, Ba3: 255, B1: 299, B2: 362, B3: 432 },
  { maturity: 5, Aaa: 46, Aa1: 58, Aa2: 63, Aa3: 71, A1: 80, A2: 91, A3: 101, Baa1: 113, Baa2: 126, Baa3: 157, Ba1: 198, Ba2: 254, Ba3: 272, B1: 312, B2: 380, B3: 454 },
  { maturity: 6, Aaa: 51, Aa1: 65, Aa2: 71, Aa3: 79, A1: 89, A2: 101, A3: 112, Baa1: 124, Baa2: 139, Baa3: 171, Ba1: 214, Ba2: 270, Ba3: 287, B1: 325, B2: 396, B3: 474 },
  { maturity: 7, Aaa: 55, Aa1: 71, Aa2: 78, Aa3: 87, A1: 97, A2: 109, A3: 121, Baa1: 135, Baa2: 151, Baa3: 184, Ba1: 227, Ba2: 284, Ba3: 300, B1: 335, B2: 410, B3: 491 },
  { maturity: 8, Aaa: 58, Aa1: 75, Aa2: 84, Aa3: 93, A1: 103, A2: 116, A3: 129, Baa1: 143, Baa2: 160, Baa3: 194, Ba1: 238, Ba2: 296, Ba3: 311, B1: 343, B2: 421, B3: 505 },
  { maturity: 9, Aaa: 61, Aa1: 80, Aa2: 89, Aa3: 98, A1: 109, A2: 123, A3: 136, Baa1: 151, Baa2: 170, Baa3: 204, Ba1: 249, Ba2: 306, Ba3: 320, B1: 351, B2: 431, B3: 518 },
  { maturity: 10, Aaa: 65, Aa1: 85, Aa2: 95, Aa3: 104, A1: 116, A2: 130, A3: 143, Baa1: 160, Baa2: 179, Baa3: 214, Ba1: 259, Ba2: 317, Ba3: 330, B1: 358, B2: 441, B3: 530 },
  { maturity: 11, Aaa: 69, Aa1: 90, Aa2: 101, Aa3: 111, A1: 122, A2: 137, A3: 151, Baa1: 168, Baa2: 188, Baa3: 224, Ba1: 269, Ba2: 327, Ba3: 339, B1: 365, B2: 450, B3: 541 },
  { maturity: 12, Aaa: 72, Aa1: 95, Aa2: 107, Aa3: 117, A1: 129, A2: 143, A3: 158, Baa1: 176, Baa2: 196, Baa3: 233, Ba1: 278, Ba2: 336, Ba3: 348, B1: 372, B2: 459, B3: 551 },
  { maturity: 13, Aaa: 76, Aa1: 100, Aa2: 112, Aa3: 123, A1: 135, A2: 150, A3: 165, Baa1: 183, Baa2: 205, Baa3: 241, Ba1: 287, Ba2: 345, Ba3: 356, B1: 379, B2: 467, B3: 561 },
  { maturity: 14, Aaa: 80, Aa1: 105, Aa2: 118, Aa3: 128, A1: 141, A2: 156, A3: 172, Baa1: 191, Baa2: 213, Baa3: 250, Ba1: 296, Ba2: 353, Ba3: 363, B1: 385, B2: 475, B3: 570 },
  { maturity: 15, Aaa: 84, Aa1: 110, Aa2: 123, Aa3: 134, A1: 147, A2: 162, A3: 178, Baa1: 198, Baa2: 220, Baa3: 258, Ba1: 304, Ba2: 361, Ba3: 371, B1: 391, B2: 482, B3: 578 },
]

const COLOR_PALETTE = ['#0f766e', '#2563eb', '#f97316', '#6b7280', '#d97706']

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

export default function CreditCurvesChart() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const { width: containerWidth } = useResizeObserver(containerRef)

  const seriesData = useMemo(() => {
    return RATINGS.map((rating, index) => ({
      rating,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      values: MATURITY_ROWS.map((row) => ({
        maturity: row.maturity,
        value: row[rating],
      })),
    }))
  }, [])

  const allMaturities = useMemo(() => MATURITY_ROWS.map((row) => row.maturity), [])

  const allValues = useMemo(() => seriesData.flatMap((series) => series.values.map((d) => d.value)), [seriesData])

  useEffect(() => {
    const svgEl = svgRef.current
    const tooltipEl = tooltipRef.current
    const containerEl = containerRef.current
    if (!svgEl || !containerEl || seriesData.length === 0) {
      if (svgEl) d3.select(svgEl).selectAll('*').remove()
      if (tooltipEl) tooltipEl.style.display = 'none'
      return
    }

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const fallbackWidth = containerEl.clientWidth || 960
    const width = Math.max(420, containerWidth || fallbackWidth)
    const height = Math.max(480, Math.round(width * 0.55))
    const margin = { top: 80, right: 72, bottom: 64, left: 80 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    if (innerWidth <= 0 || innerHeight <= 0) return

    svg.attr('viewBox', `0 0 ${width} ${height}`)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleLinear()
      .domain(d3.extent(allMaturities))
      .range([0, innerWidth])

    const valueExtent = d3.extent(allValues)
    const paddedExtent = [
      Math.max(0, (valueExtent[0] ?? 0) - 15),
      (valueExtent[1] ?? 0) + 25,
    ]
    const y = d3
      .scaleLinear()
      .domain(paddedExtent)
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
      .ticks(allMaturities.length)
      .tickFormat((d) => `Y${Math.round(d)}`)
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
      .tickFormat((d) => `${d3.format(',')(d)} bps`)
      .tickPadding(8)

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call((axis) => axis.selectAll('text').attr('font-size', 11).attr('fill', '#475569'))
      .call((axis) => axis.select('path').attr('stroke', '#94a3b8'))
      .call((axis) => axis.selectAll('line').attr('stroke', '#cbd5e1'))

    const lineGenerator = d3
      .line()
      .defined((d) => d.value != null && Number.isFinite(d.value))
      .x((d) => x(d.maturity))
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
      .attr('d', (d) => lineGenerator(d.values))

    seriesGroups
      .append('text')
      .attr('class', 'series-label')
      .attr('x', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        return last ? x(last.maturity) + 6 : innerWidth + 6
      })
      .attr('y', (d) => {
        const last = [...d.values].reverse().find((v) => v.value != null && Number.isFinite(v.value))
        return last ? y(last.value) : y(paddedExtent[0])
      })
      .attr('fill', (d) => d.color)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('alignment-baseline', 'middle')
      .text((d) => d.rating)

    seriesGroups
      .append('g')
      .attr('class', 'series-points')
      .selectAll('circle')
      .data((d) => d.values)
      .join('circle')
      .attr('r', 2.75)
      .attr('cx', (d) => x(d.maturity))
      .attr('cy', (d) => y(d.value))
      .attr('fill', (d, i, nodes) => d3.select(nodes[i].parentNode.parentNode).datum().color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)

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
      .attr('r', 5)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    const seriesValueMaps = seriesData.map((series) => ({
      rating: series.rating,
      color: series.color,
      map: new Map(series.values.map((v) => [v.maturity, v.value])),
    }))

    const overlay = g
      .append('rect')
      .attr('class', 'interaction-layer')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    const maturities = allMaturities

    const nearestMaturity = (raw) => {
      let candidate = maturities[0]
      let minDiff = Number.POSITIVE_INFINITY
      for (const m of maturities) {
        const diff = Math.abs(m - raw)
        if (diff < minDiff) {
          minDiff = diff
          candidate = m
        }
      }
      return candidate
    }

    const formatter = d3.format(',')

    const showTooltip = (event) => {
      const [mx] = d3.pointer(event, g.node())
      const xValue = x.invert(mx)
      const maturity = nearestMaturity(xValue)
      const xPos = x(maturity)

      const rows = []
      seriesValueMaps.forEach((series, idx) => {
        const value = series.map.get(maturity)
        if (value != null && Number.isFinite(value)) {
          rows.push({
            rating: series.rating,
            value,
            color: series.color,
          })
        }
        const dot = focusDots.nodes()[idx]
        if (dot) {
          d3.select(dot)
            .attr('cx', xPos)
            .attr('cy', value != null && Number.isFinite(value) ? y(value) : y(paddedExtent[0]))
            .attr('opacity', value != null && Number.isFinite(value) ? 1 : 0)
        }
      })

      if (rows.length === 0) {
        focusGroup.style('display', 'none')
        if (tooltipEl) tooltipEl.style.display = 'none'
        return
      }

      focusGroup.style('display', null)
      focusLine.attr('x1', xPos).attr('x2', xPos)

      if (tooltipEl) {
        tooltipEl.style.display = 'block'
        tooltipEl.innerHTML = `
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Maturity Y${maturity}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] leading-tight">
            ${rows
              .map(
                (row) => `
                  <div class="flex items-center gap-2">
                    <span class="inline-flex size-2.5 rounded-full" style="background:${row.color}"></span>
                    <span class="font-medium text-slate-700">${row.rating}</span>
                  </div>
                  <div class="text-right text-slate-500">${formatter(row.value)} bps</div>
                `
              )
              .join('')}
          </div>
        `
        const tooltipWidth = tooltipEl.offsetWidth || 220
        const absoluteX = margin.left + xPos
        let tooltipLeft = absoluteX + 20
        let tooltipTop = margin.top + 20
        if (tooltipLeft + tooltipWidth > width) {
          tooltipLeft = absoluteX - tooltipWidth - 20
        }
        tooltipEl.style.left = `${Math.max(8, tooltipLeft)}px`
        tooltipEl.style.top = `${Math.max(8, tooltipTop)}px`
      }
    }

    overlay.on('mousemove', (event) => {
      showTooltip(event)
    })

    overlay.on('mouseleave', () => {
      focusGroup.style('display', 'none')
      if (tooltipEl) tooltipEl.style.display = 'none'
    })
  }, [seriesData, allMaturities, allValues, containerWidth])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] rounded-xl border border-slate-200 bg-white shadow-sm p-4"
    >
      <div className="mb-3 text-xs text-slate-500">
        Las curvas mostradas corresponden a Moody's Aaa, A2, Aa3, Aa1 y Aa2; los rótulos aparecen al final de cada línea.
      </div>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Curvas de crédito por rating" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
        style={{ minWidth: '220px' }}
      />
      <div className="mt-4 text-xs text-slate-500">Fuente: Moody's Investors Service (cálculos internos).</div>
    </div>
  )
}
