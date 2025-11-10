import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'sp_01', title: 'Yield on customer loans', label: 'Yield on customer loans' },
  { id: 'sp_02', title: 'Cost of funds', label: 'Cost of funds' },
  { id: 'sp_03', title: 'Spread', label: 'Spread' },
]

export default function CostosRendimientoChart() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="sp_01" />
}
