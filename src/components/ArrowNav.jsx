import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import routes from '../routes'

export default function ArrowNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentIndex = routes.findIndex((r) => r.path === location.pathname)

  const prev = currentIndex > 0 ? routes[currentIndex - 1] : null
  const next = currentIndex < routes.length - 1 ? routes[currentIndex + 1] : null

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowUp' && prev) {
        navigate(prev.path, { state: { dir: 'up' } })
      } else if (e.key === 'ArrowDown' && next) {
        navigate(next.path, { state: { dir: 'down' } })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, prev, next])

  return (
    <nav className="fixed bottom-5 left-5 flex flex-col gap-3" aria-label="Navegación por flechas">
      <button
        type="button"
        onClick={() => prev && navigate(prev.path, { state: { dir: 'up' } })}
        disabled={!prev}
        aria-label={prev ? `Ir a ${prev.title}` : 'No disponible'}
        className="focus-ring rounded-full w-12 h-12 flex items-center justify-center border border-slate-200 bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
      >
        <span aria-hidden>↑</span>
      </button>
      <button
        type="button"
        onClick={() => next && navigate(next.path, { state: { dir: 'down' } })}
        disabled={!next}
        aria-label={next ? `Ir a ${next.title}` : 'No disponible'}
        className="focus-ring rounded-full w-12 h-12 flex items-center justify-center border border-slate-200 bg-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
      >
        <span aria-hidden>↓</span>
      </button>
    </nav>
  )
}
