import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'moodys_01', title: 'Leverage Ratio', label: 'Leverage Ratio' },
  { id: 'moodys_02', title: 'Usable Equity/Gross Loans', label: 'Usable Equity/Gross Loans' },
  { id: 'moodys_03', title: 'Return on Average Assets', label: 'Return on Average Assets' },
  { id: 'moodys_04', title: 'Return on Average Equity', label: 'Return on Average Equity' },
  { id: 'moodys_05', title: 'Net Interest Margin', label: 'Net Interest Margin' },
]

export default function RatiosMoodysChart() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="moodys_01" />
}


