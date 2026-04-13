import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import DatasetManager from './pages/DatasetManager'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

// Lazy-load the ML-heavy component to reduce initial bundle size.
// LiveRecognition pulls in Socket.IO, WebcamPreview, PredictionDisplay, etc.
const LiveRecognition = lazy(() => import('./pages/LiveRecognition'))

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<LiveRecognition />} />
        <Route path="/dataset" element={<DatasetManager />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
