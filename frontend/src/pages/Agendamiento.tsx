import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useApp } from '../context/AppContext'

interface Cita {
  id: string
  estudiante_id: string
  consejero_id: string
  fecha_hora: string
  modalidad: string
  estado: string
  link_sala?: string
  estudiante?: { nombre: string; carrera: string }
}

export default function Agendamiento() {
  const { apiUrl, usuario } = useApp()
  const navigate = useNavigate()
  const [citas, setCitas] = useState<Cita[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [nueva, setNueva] = useState({
    estudiante_id: '',
    fecha_hora: '',
    modalidad: 'videollamada',
    link_sala: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol === 'estudiante') { navigate('/estudiante'); return }
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (usuario?.id) params.set('consejero_id', usuario.id)
      const res = await fetch(`${apiUrl}/citas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCitas(data.citas ?? [])
      }
    } catch {
      /* no-op */
    } finally {
      setCargando(false)
    }
  }

  const agendar = async () => {
    if (!nueva.estudiante_id || !nueva.fecha_hora || !usuario) return
    setGuardando(true)
    try {
      await fetch(`${apiUrl}/cita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: nueva.estudiante_id,
          consejero_id: usuario.id ?? '00000000-0000-0000-0000-000000000000',
          fecha_hora: nueva.fecha_hora,
          modalidad: nueva.modalidad,
          link_sala: nueva.link_sala || undefined,
        }),
      })
      setModalNueva(false)
      setNueva({ estudiante_id: '', fecha_hora: '', modalidad: 'videollamada', link_sala: '' })
      cargar()
    } catch {
      /* no-op */
    } finally {
      setGuardando(false)
    }
  }

  const ESTADO_BADGE: Record<string, string> = {
    agendada:  'bg-blue-100 text-blue-700',
    realizada: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
  }

  const MODALIDAD_ICON: Record<string, string> = {
    videollamada: '📹',
    presencial:   '🏫',
    telefonica:   '📞',
  }

  const citasFiltradas = filtroEstado
    ? citas.filter((c) => c.estado === filtroEstado)
    : citas

  const citasOrdenadas = [...citasFiltradas].sort(
    (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Agenda de Citas</h1>
          <div className="flex gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
            >
              <option value="">Todos los estados</option>
              <option value="agendada">Agendadas</option>
              <option value="realizada">Realizadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
            <button
              onClick={() => setModalNueva(true)}
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              + Nueva cita
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-slate-400 text-center py-16">Cargando agenda...</p>
        ) : citasOrdenadas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <p className="text-slate-400 text-sm">No hay citas agendadas.</p>
            <button
              onClick={() => setModalNueva(true)}
              className="mt-3 text-indigo-600 text-sm hover:underline"
            >
              Agendar la primera cita
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {citasOrdenadas.map((cita) => {
              const fecha = new Date(cita.fecha_hora)
              const hoy = new Date()
              const esHoy = fecha.toDateString() === hoy.toDateString()
              return (
                <div
                  key={cita.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${
                    esHoy ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-100'
                  }`}
                >
                  {/* Fecha */}
                  <div className="min-w-[64px] text-center bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500 uppercase">
                      {fecha.toLocaleDateString('es-CL', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 leading-none">{fecha.getDate()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">{MODALIDAD_ICON[cita.modalidad] ?? '📅'}</span>
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {cita.estudiante?.nombre ?? `Estudiante ${cita.estudiante_id.slice(0, 8)}...`}
                      </p>
                      {esHoy && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Hoy
                        </span>
                      )}
                    </div>
                    {cita.estudiante?.carrera && (
                      <p className="text-xs text-slate-500">{cita.estudiante.carrera}</p>
                    )}
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{cita.modalidad}</p>
                  </div>

                  {/* Estado y link */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${ESTADO_BADGE[cita.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                      {cita.estado}
                    </span>
                    {cita.link_sala && cita.estado === 'agendada' && (
                      <a
                        href={cita.link_sala}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Unirse →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nueva cita */}
      {modalNueva && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Agendar Cita</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">
                  ID del Estudiante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nueva.estudiante_id}
                  onChange={(e) => setNueva((p) => ({ ...p, estudiante_id: e.target.value }))}
                  placeholder="UUID del estudiante"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">
                  Fecha y hora <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={nueva.fecha_hora}
                  onChange={(e) => setNueva((p) => ({ ...p, fecha_hora: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">Modalidad</label>
                <select
                  value={nueva.modalidad}
                  onChange={(e) => setNueva((p) => ({ ...p, modalidad: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="videollamada">Videollamada</option>
                  <option value="presencial">Presencial</option>
                  <option value="telefonica">Telefónica</option>
                </select>
              </div>
              {nueva.modalidad === 'videollamada' && (
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-1">Link de sala</label>
                  <input
                    type="url"
                    value={nueva.link_sala}
                    onChange={(e) => setNueva((p) => ({ ...p, link_sala: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalNueva(false)}
                className="flex-1 text-sm border border-slate-300 text-slate-600 py-2 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={agendar}
                disabled={guardando || !nueva.estudiante_id || !nueva.fecha_hora}
                className="flex-1 text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
