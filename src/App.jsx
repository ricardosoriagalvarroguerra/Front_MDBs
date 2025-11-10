import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import './index.css'

import TopBar from './components/TopBar'
import ArrowNav from './components/ArrowNav'
import routes from './routes.jsx'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence initial={false} mode="wait">
      <Routes location={location} key={location.pathname}>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<route.Component />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white">
        <TopBar />
        <div className="flex-1">
          <AnimatedRoutes />
        </div>
        <ArrowNav />
      </div>
    </BrowserRouter>
  )
}
