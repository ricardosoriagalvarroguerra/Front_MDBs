import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'WABR', title: 'Weighted Average Borrower Rating (WABR)', label: 'WABR', valueAxisDigits: 0, valueTooltipDigits: 0 },
  { id: 'WASR', title: 'Weighted Average Shareholder Rating (WASR)', label: 'WASR', valueAxisDigits: 0, valueTooltipDigits: 0 },
]

export default function WabrWasrChart() {
  return (
    <SeriesChart
      chartTypes={CHART_TYPES}
      initialChartTypeId="WABR"
      endpointPath="/wabr-wasr/"
    />
  )
}


