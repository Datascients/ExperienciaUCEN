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
  const [busqueda, setBusqueda] = useState<string>('')
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

  const nivelEstudiante = (e: Estudiante) => e.desercion_scores_ml?.[0]?.nivel ?? 'bajo'
  const scoreEstudiante = (e: Estudiante) => e.desercion_scores_ml?.[0]?.score

  const filtrados = estudiantes
    .filter((e) => !busqueda || e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .slice(0, 50)

  const conteos = {
    alto: estudiantes.filter((e) => nivelEstudiante(e) === 'alto').length,
    medio: estudiantes.filter((e) => nivelEstudiante(e) === 'medio').length,
    bajo: estudiantes.filter((e) => nivelEstudiante(e) === 'bajo').length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">Estudiantes en Seguimiento</h1>
          <p className="text-slate-300 text-sm">Panel del consejero · {usuario?.nombre}</p>

          {/* Mini stats */}
          <div className="flex gap-4 mt-5">
            {[
              { label: 'Total', value: estudiantes.length, color: 'bg-white/10' },
              { label: 'Riesgo Alto', value: conteos.alto, color: 'bg-red-500/20 text-red-200' },
              { label: 'Riesgo Medio', value: conteos.medio, color: 'bg-amber-500/20 text-amber-200' },
              { label: 'Riesgo Bajo', value: conteos.bajo, color: 'bg-emerald-500/20 text-emerald-200' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-2 text-center min-w-[80px]`}>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 min-w-[180px] text-sm border border-slate-300 bg-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="text-sm border border-slate-300 bg-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los niveles</option>
            <option value="alto">🔴 Riesgo alto</option>
            <option value="medio">🟡 Riesgo medio</option>
            <option value="bajo">🟢 Riesgo bajo</option>
          </select>
          <select
            value={filtroCarrera}
            onChange={(e) => setFiltroCarrera(e.target.value)}
            className="text-sm border border-slate-300 bg-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las carreras</option>
            <option>Ingeniería Civil</option>
            <option>Pedagogía</option>
            <option>Enfermería</option>
            <option>Administración</option>
            <option>Derecho</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Estudiante</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Carrera</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Semestre</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Promedio</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Riesgo</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No hay estudiantes que mostrar.
                  </td>
                </tr>
              ) : (
                filtrados.map((est) => (
                  <tr
                    key={est.id}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/estudiante/${est.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                          {est.nombre.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800">{est.nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{est.carrera}</td>
                    <td className="px-5 py-3.5 text-slate-600">Sem. {est.semestre}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-semibold ${
                        (est.promedio ?? 0) < 4.5 ? 'text-red-600' :
                        (est.promedio ?? 0) < 5.5 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {est.promedio?.toFixed(1) ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <SemaforoRiesgo nivel={nivelEstudiante(est)} score={scoreEstudiante(est)} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-indigo-500 text-xs font-medium group-hover:text-indigo-700 text-right">
                      Ver ficha →
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!cargando && filtrados.length > 0 && (
          <p className="text-xs text-slate-400 mt-2 text-right">
            Mostrando {filtrados.length} de {estudiantes.length} estudiantes
          </p>
        )}
      </div>

      <ChatbotWidget />
    </div>
  )
}
