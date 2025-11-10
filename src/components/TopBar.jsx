import { useLocation } from 'react-router-dom'
import routes from '../routes'

export default function TopBar() {
  const location = useLocation()
  const currentIndex = routes.findIndex((r) => r.path === location.pathname)
  const current = routes[Math.max(0, currentIndex)]

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary text-white font-bold">VPF</div>
          <div className="flex flex-col leading-tight">
            <h1 className="text-base md:text-lg font-semibold text-slate-900">Indicadores Financieros MDBs</h1>
            <span className="text-xs md:text-sm text-slate-600">{current?.title || 'Home'}</span>
          </div>
        </div>
        <div className="text-xs md:text-sm text-slate-600" aria-live="polite">
          <span className="px-2 py-1 rounded-md border bg-white">{Math.max(1, currentIndex + 1)} / {routes.length}</span>
        </div>
      </div>
    </header>
  )
}
