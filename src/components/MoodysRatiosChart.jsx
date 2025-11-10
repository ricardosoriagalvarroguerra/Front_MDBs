import SeriesChart from './SeriesChart'

const CHART_TYPES = [
  { id: '__all__', title: 'Ver todos', label: 'Ver todos' },
  { id: 'moodys_06', title: 'Weighted average borrower rating', label: 'Weighted average borrower rating' },
  { id: 'moodys_07', title: 'Weighted average shareholder rating', label: 'Weighted average shareholder rating' },
]

export default function MoodysRatiosChart() {
  return <SeriesChart chartTypes={CHART_TYPES} initialChartTypeId="moodys_06" />
}



