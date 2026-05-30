import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Landing from './pages/Landing'
import DashboardConsejero from './pages/DashboardConsejero'
import DashboardEstudiante from './pages/DashboardEstudiante'
import FichaEstudiante from './pages/FichaEstudiante'
import Reporteria from './pages/Reporteria'
import Agendamiento from './pages/Agendamiento'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<DashboardConsejero />} />
          <Route path="/estudiante" element={<DashboardEstudiante />} />
          <Route path="/estudiante/:id" element={<FichaEstudiante />} />
          <Route path="/reporteria" element={<Reporteria />} />
          <Route path="/agendamiento" element={<Agendamiento />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
