import SeriesChart from './SeriesChart'

const MILLIONS_CONFIG = {
  valueDivisor: 1_000_000,
  valueSuffix: ' M USD',
  valueAxisDigits: 0,
  valueTooltipDigits: 2,
}

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'sp_08', title: 'Activos totales', label: 'Activos totales', ...MILLIONS_CONFIG },
  { id: 'sp_10', title: 'Prestamos Netos', label: 'Prestamos Netos', ...MILLIONS_CONFIG },
  { id: 'sp_09', title: 'Equity', label: 'Equity', ...MILLIONS_CONFIG },
  { id: 'sp_11', title: 'Liabilities', label: 'Liabilities', ...MILLIONS_CONFIG },
]

export default function Balance() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="sp_08" withArea />
}

