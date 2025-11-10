import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'sp_12', title: 'ROAEE', label: 'ROAEE' },
  { id: 'sp_13', title: 'ROAA', label: 'ROAA' },
  { id: 'sp_14', title: 'Net interest margin', label: 'Net interest margin' },
]

export default function BalanceRatiosChart() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="sp_12" />
}
