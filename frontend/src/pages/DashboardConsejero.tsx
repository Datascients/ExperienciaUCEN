import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SemaforoRiesgo from '../components/SemaforoRiesgo'
import ChatbotWidget from '../components/ChatbotWidget'
import { useApp } from '../context/AppContext'

interface Estudiante {
  id: string
  nombre: string
  carrera: string
  semestre: number
  promedio: number
  desercion_scores_ml?: { score: number; nivel: string }[]
}

export default function DashboardConsejero() {
  const { apiUrl, usuario } = useApp()
  const navigate = useNavigate()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [filtroCarrera, setFiltroCarrera] = useState<string>('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    cargar()
  }, [filtroNivel, filtroCarrera])

  const cargar = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtroNivel) params.set('nivel_riesgo', filtroNivel)
      if (filtroCarrera) params.set('carrera', filtroCarrera)
      const res = await fetch(`${apiUrl}/estudiantes?${params}`)
      const data = await res.json()
      setEstudiantes(data.estudiantes ?? [])
    } catch {
      setEstudiantes([])
    } finally {
      setCargando(false)
    }
  }

  const nivelEstudiante = (e: Estudiante) =>
    e.desercion_scores_ml?.[0]?.nivel ?? 'bajo'

  const scoreEstudiante = (e: Estudiante) =>
    e.desercion_scores_ml?.[0]?.score

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Estudiantes en Seguimiento</h1>
          <div className="flex gap-3">
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
            >
              <option value="">Todos los niveles</option>
              <option value="alto">Riesgo alto</option>
              <option value="medio">Riesgo medio</option>
              <option value="bajo">Riesgo bajo</option>
            </select>
            <select
              value={filtroCarrera}
              onChange={(e) => setFiltroCarrera(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
            >
              <option value="">Todas las carreras</option>
              <option>Ingeniería Civil</option>
              <option>Pedagogía</option>
              <option>Enfermería</option>
              <option>Administración</option>
              <option>Derecho</option>
            </select>
          </div>
        </div>

        {cargando ? (
          <p className="text-slate-400 text-center py-12">Cargando estudiantes...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estudiante</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Carrera</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Semestre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Promedio</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Riesgo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {estudiantes.slice(0, 50).map((est) => (
                  <tr key={est.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/estudiante/${est.id}`)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{est.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{est.carrera}</td>
                    <td className="px-4 py-3 text-slate-600">Sem. {est.semestre}</td>
                    <td className="px-4 py-3 text-slate-600">{est.promedio?.toFixed(1) ?? '-'}</td>
                    <td className="px-4 py-3">
                      <SemaforoRiesgo nivel={nivelEstudiante(est)} score={scoreEstudiante(est)} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-indigo-600 text-xs">Ver ficha →</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {estudiantes.length === 0 && (
              <p className="text-center py-8 text-slate-400">Sin estudiantes que mostrar.</p>
            )}
          </div>
        )}
      </div>
      <ChatbotWidget />
    </div>
  )
}
