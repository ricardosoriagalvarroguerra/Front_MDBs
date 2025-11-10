import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'sp_04', title: 'Gasto operativo/Prestamos', label: 'Gasto operativo/Prestamos' },
  { id: 'sp_05', title: 'Personal/Equity', label: 'Personal/Equity' },
  { id: 'sp_06', title: 'Gasto operativo/Equity', label: 'Gasto operativo/Equity' },
  { id: 'sp_07', title: 'Personal/Prestamos', label: 'Personal/Prestamos' },
]

export default function OperativoChart() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="sp_04" />
}
