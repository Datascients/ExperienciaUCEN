import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SemaforoRiesgo from '../components/SemaforoRiesgo'
import TimelineIntervencion from '../components/TimelineIntervencion'
import ChatbotWidget from '../components/ChatbotWidget'
import { useApp } from '../context/AppContext'

interface Estudiante {
  id: string
  rut: string
  nombre: string
  carrera: string
  semestre: number
  creditos_aprobados: number
  promedio: number
  porcentaje_asistencia: number
  estado: string
  datos_socioeconomicos?: Record<string, unknown>
}

interface ScoreML {
  score: number
  nivel: string
  features?: Record<string, unknown>
  calculado_en: string
  modelo_version?: string
}

interface Intervencion {
  id: string
  tipo: string
  estado: string
  notas?: string
  created_at: string
}

export default function FichaEstudiante() {
  const { id } = useParams<{ id: string }>()
  const { apiUrl, usuario } = useApp()
  const navigate = useNavigate()
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null)
  const [scoreML, setScoreML] = useState<ScoreML | null>(null)
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalIntervencion, setModalIntervencion] = useState(false)
  const [nuevaIntervencion, setNuevaIntervencion] = useState({ tipo: 'llamada', notas: '' })

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    cargar()
  }, [id])

  const cargar = async () => {
    if (!id) return
    setCargando(true)
    try {
      const [fichaRes, intRes] = await Promise.all([
        fetch(`${apiUrl}/estudiante/${id}`),
        fetch(`${apiUrl}/intervenciones?estudiante_id=${id}`),
      ])
      const ficha = await fichaRes.json()
      setEstudiante(ficha.estudiante)
      setScoreML(ficha.score_ml)
      if (intRes.ok) {
        const intData = await intRes.json()
        setIntervenciones(intData.intervenciones ?? [])
      }
    } catch {
      /* no-op */
    } finally {
      setCargando(false)
    }
  }

  const crearIntervencion = async () => {
    if (!id || !usuario) return
    try {
      await fetch(`${apiUrl}/intervencion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: id,
          consejero_id: usuario.id ?? '00000000-0000-0000-0000-000000000000',
          tipo: nuevaIntervencion.tipo,
          notas: nuevaIntervencion.notas,
        }),
      })
      setModalIntervencion(false)
      setNuevaIntervencion({ tipo: 'llamada', notas: '' })
      cargar()
    } catch {
      /* no-op */
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="text-center py-20 text-slate-400">Cargando ficha...</p>
      </div>
    )
  }

  if (!estudiante) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-2xl mx-auto py-20 text-center">
          <p className="text-slate-500 mb-4">Estudiante no encontrado.</p>
          <button onClick={() => navigate('/dashboard')} className="text-indigo-600 text-sm hover:underline">
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  const nivel = scoreML?.nivel ?? 'bajo'
  const score = scoreML?.score

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-indigo-600 hover:underline mb-2 block">
              ← Volver al listado
            </button>
            <h1 className="text-2xl font-bold text-slate-800">{estudiante.nombre}</h1>
            <p className="text-slate-500 text-sm">{estudiante.rut} · {estudiante.carrera} · Sem. {estudiante.semestre}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SemaforoRiesgo nivel={nivel} score={score} size="lg" />
            {usuario?.rol !== 'estudiante' && (
              <button
                onClick={() => setModalIntervencion(true)}
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                + Nueva intervención
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Métricas académicas */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-700 mb-4">Métricas Académicas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Promedio', value: estudiante.promedio?.toFixed(1) ?? '-' },
                  { label: 'Asistencia', value: estudiante.porcentaje_asistencia !== undefined ? `${(estudiante.porcentaje_asistencia * 100).toFixed(0)}%` : '-' },
                  { label: 'Créditos', value: estudiante.creditos_aprobados ?? '-' },
                  { label: 'Estado', value: estudiante.estado ?? '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-xl font-bold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Score ML detalle */}
            {scoreML && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-700 mb-3">Score de Riesgo ML</h2>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-3xl font-bold text-slate-800">
                    {(scoreML.score * 100).toFixed(0)}%
                  </div>
                  <div>
                    <SemaforoRiesgo nivel={scoreML.nivel} size="md" />
                    {scoreML.modelo_version && (
                      <p className="text-xs text-slate-400 mt-1">Modelo: {scoreML.modelo_version}</p>
                    )}
                  </div>
                </div>
                {scoreML.features && Object.keys(scoreML.features).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Factores considerados:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(scoreML.features).map(([k, v]) => (
                        <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  Calculado: {new Date(scoreML.calculado_en).toLocaleDateString('es-CL')}
                </p>
              </div>
            )}
          </div>

          {/* Intervenciones */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Historial de Intervenciones</h2>
            <TimelineIntervencion intervenciones={intervenciones} />
          </div>
        </div>
      </div>

      {/* Modal nueva intervención */}
      {modalIntervencion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Nueva Intervención</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">Tipo</label>
                <select
                  value={nuevaIntervencion.tipo}
                  onChange={(e) => setNuevaIntervencion((p) => ({ ...p, tipo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="llamada">Llamada telefónica</option>
                  <option value="entrevista">Entrevista presencial</option>
                  <option value="videollamada">Videollamada</option>
                  <option value="derivacion_psicologia">Derivación psicología</option>
                  <option value="derivacion_becas">Derivación becas</option>
                  <option value="plan_academico">Plan académico personalizado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">Notas</label>
                <textarea
                  value={nuevaIntervencion.notas}
                  onChange={(e) => setNuevaIntervencion((p) => ({ ...p, notas: e.target.value }))}
                  rows={3}
                  placeholder="Observaciones de la intervención..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setModalIntervencion(false)}
                className="flex-1 text-sm border border-slate-300 text-slate-600 py-2 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearIntervencion}
                className="flex-1 text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatbotWidget estudianteId={id} />
    </div>
  )
}
