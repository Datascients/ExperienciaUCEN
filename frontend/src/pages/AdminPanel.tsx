import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useApp } from '../context/AppContext'

interface KPIs {
  total_estudiantes?: number
  riesgo_alto?: number
  riesgo_medio?: number
  riesgo_bajo?: number
  intervenciones_pendientes?: number
  intervenciones_exitosas?: number
  tasa_retencion?: number
}

interface FeedbackForm {
  estudiante_id: string
  observacion: string
  consejero_id: string
}

export default function AdminPanel() {
  const { apiUrl, usuario } = useApp()
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KPIs>({})
  const [cargando, setCargando] = useState(true)
  const [tabActiva, setTabActiva] = useState<'resumen' | 'feedback' | 'seed'>('resumen')
  const [feedback, setFeedback] = useState<FeedbackForm>({ estudiante_id: '', observacion: '', consejero_id: '' })
  const [feedbackEnviado, setFeedbackEnviado] = useState(false)
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)
  const [seedMensaje, setSeedMensaje] = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol !== 'admin') { navigate('/dashboard'); return }
    cargarKPIs()
  }, [])

  const cargarKPIs = async () => {
    setCargando(true)
    try {
      const res = await fetch(`${apiUrl}/admin/reporteria`)
      if (res.ok) setKpis(await res.json())
    } catch {
      /* no-op */
    } finally {
      setCargando(false)
    }
  }

  const enviarFeedback = async () => {
    if (!feedback.estudiante_id || !feedback.observacion) return
    setEnviandoFeedback(true)
    try {
      const res = await fetch(`${apiUrl}/admin/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: feedback.estudiante_id,
          observacion: feedback.observacion,
          consejero_id: feedback.consejero_id || usuario?.id,
        }),
      })
      if (res.ok) {
        setFeedbackEnviado(true)
        setFeedback({ estudiante_id: '', observacion: '', consejero_id: '' })
        setTimeout(() => setFeedbackEnviado(false), 3000)
      }
    } catch {
      /* no-op */
    } finally {
      setEnviandoFeedback(false)
    }
  }

  const tabs: { key: typeof tabActiva; label: string }[] = [
    { key: 'resumen', label: 'Resumen del Sistema' },
    { key: 'feedback', label: 'Registrar Observación' },
    { key: 'seed', label: 'Datos de Prueba' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
            <p className="text-sm text-slate-500">Bienvenido, {usuario?.nombre}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTabActiva(key)}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                tabActiva === key
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Resumen */}
        {tabActiva === 'resumen' && (
          <div>
            {cargando ? (
              <p className="text-slate-400 py-8">Cargando...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Estudiantes', value: kpis.total_estudiantes ?? '—', color: 'text-slate-800' },
                    { label: 'Riesgo Alto', value: kpis.riesgo_alto ?? '—', color: 'text-red-600' },
                    { label: 'Riesgo Medio', value: kpis.riesgo_medio ?? '—', color: 'text-yellow-600' },
                    { label: 'Riesgo Bajo', value: kpis.riesgo_bajo ?? '—', color: 'text-green-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-2xl font-bold text-indigo-600">{kpis.intervenciones_pendientes ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">Intervenciones pendientes</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-2xl font-bold text-green-600">{kpis.intervenciones_exitosas ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">Intervenciones exitosas</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-2xl font-bold text-blue-600">
                      {kpis.tasa_retencion !== undefined
                        ? `${(kpis.tasa_retencion * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Tasa de retención</p>
                  </div>
                </div>

                {/* Sistema info */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">Estado del Sistema</h2>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: 'Backend API', url: apiUrl, estado: 'operativo' },
                      { label: 'Pinecone Index', url: 'desercion-docs', estado: 'activo' },
                      { label: 'Supabase DB', url: 'tablas desercion_*', estado: 'conectado' },
                    ].map(({ label, url, estado }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <div>
                          <span className="font-medium text-slate-700">{label}</span>
                          <span className="ml-2 text-xs text-slate-400">{url}</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{estado}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credenciales de prueba */}
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Credenciales de prueba</p>
                  <div className="grid grid-cols-3 gap-3 text-xs text-amber-700">
                    <div><p className="font-medium">Admin</p><p>Admin / 1234</p><p className="text-amber-500">/admin</p></div>
                    <div><p className="font-medium">Consejero</p><p>consejero@uai.cl / demo2025</p><p className="text-amber-500">/dashboard</p></div>
                    <div><p className="font-medium">Estudiante</p><p>cualquier email / cualquier clave</p><p className="text-amber-500">/estudiante</p></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Feedback */}
        {tabActiva === 'feedback' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Registrar Observación de Estudiante</h2>
            {feedbackEnviado && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
                Observación registrada correctamente.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">
                  ID del Estudiante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={feedback.estudiante_id}
                  onChange={(e) => setFeedback((p) => ({ ...p, estudiante_id: e.target.value }))}
                  placeholder="UUID del estudiante"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">
                  Observación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedback.observacion}
                  onChange={(e) => setFeedback((p) => ({ ...p, observacion: e.target.value }))}
                  rows={4}
                  placeholder="Describe la situación o novedad del estudiante..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1">ID del Consejero (opcional)</label>
                <input
                  type="text"
                  value={feedback.consejero_id}
                  onChange={(e) => setFeedback((p) => ({ ...p, consejero_id: e.target.value }))}
                  placeholder={usuario?.id ?? 'UUID del consejero'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={enviarFeedback}
              disabled={enviandoFeedback || !feedback.estudiante_id || !feedback.observacion}
              className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {enviandoFeedback ? 'Enviando...' : 'Registrar observación'}
            </button>
          </div>
        )}

        {/* Tab: Seed */}
        {tabActiva === 'seed' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-semibold text-slate-700 mb-2">Datos de Prueba (Seed)</h2>
            <p className="text-sm text-slate-500 mb-4">
              Carga 500 estudiantes ficticios, 10 consejeros, intervenciones y scores ML de prueba en Supabase.
            </p>

            {seedMensaje && (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3 whitespace-pre-wrap font-mono">
                {seedMensaje}
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-xs font-mono text-slate-600">
              <p className="font-semibold text-slate-700 mb-2">Ejecutar desde terminal:</p>
              <p>python -m src.db.seed</p>
            </div>

            <div className="text-sm text-slate-500 space-y-1">
              <p>El seed crea:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>500 estudiantes (30% alto, 40% medio, 30% bajo riesgo)</li>
                <li>5 carreras: Ingeniería Civil, Pedagogía, Enfermería, Administración, Derecho</li>
                <li>10 consejeros + 20 docentes</li>
                <li>3 semestres de historial por estudiante</li>
                <li>Intervenciones con resultados variados</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
