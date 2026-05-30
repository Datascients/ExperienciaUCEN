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

interface AgentStatus {
  status: string
  agent_ready: boolean
  init_error?: string
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
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tabActiva, setTabActiva] = useState<'resumen' | 'feedback' | 'seed' | 'api'>('resumen')
  const [feedback, setFeedback] = useState<FeedbackForm>({ estudiante_id: '', observacion: '', consejero_id: '' })
  const [feedbackEnviado, setFeedbackEnviado] = useState(false)
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol !== 'admin') { navigate('/dashboard'); return }
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [kpiRes, healthRes] = await Promise.all([
        fetch(`${apiUrl}/admin/reporteria`).catch(() => null),
        fetch(`${apiUrl}/`).catch(() => null),
      ])
      if (kpiRes?.ok) setKpis(await kpiRes.json())
      if (healthRes?.ok) setAgentStatus(await healthRes.json())
    } catch { /* no-op */ } finally {
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
    } catch { /* no-op */ } finally {
      setEnviandoFeedback(false)
    }
  }

  const swaggerUrl = `${apiUrl}/docs`
  const redocUrl = `${apiUrl}/redoc`

  const stats = [
    { label: 'Total Estudiantes', value: kpis.total_estudiantes ?? '—', icon: '👥', ring: 'ring-indigo-100', badge: 'bg-indigo-50 text-indigo-700' },
    { label: 'Riesgo Alto', value: kpis.riesgo_alto ?? '—', icon: '🔴', ring: 'ring-red-100', badge: 'bg-red-50 text-red-700' },
    { label: 'Riesgo Medio', value: kpis.riesgo_medio ?? '—', icon: '🟡', ring: 'ring-amber-100', badge: 'bg-amber-50 text-amber-700' },
    { label: 'Riesgo Bajo', value: kpis.riesgo_bajo ?? '—', icon: '🟢', ring: 'ring-emerald-100', badge: 'bg-emerald-50 text-emerald-700' },
    { label: 'Intervenciones Pendientes', value: kpis.intervenciones_pendientes ?? '—', icon: '⏳', ring: 'ring-violet-100', badge: 'bg-violet-50 text-violet-700' },
    { label: 'Intervenciones Exitosas', value: kpis.intervenciones_exitosas ?? '—', icon: '✅', ring: 'ring-cyan-100', badge: 'bg-cyan-50 text-cyan-700' },
    {
      label: 'Tasa de Retención', icon: '📈', ring: 'ring-teal-100', badge: 'bg-teal-50 text-teal-700',
      value: kpis.tasa_retencion !== undefined ? `${(kpis.tasa_retencion * 100).toFixed(1)}%` : '—',
    },
  ]

  const tabs = [
    { key: 'resumen' as const, label: 'Resumen', icon: '📊' },
    { key: 'api' as const, label: 'API & Docs', icon: '🔌' },
    { key: 'feedback' as const, label: 'Observación', icon: '📝' },
    { key: 'seed' as const, label: 'Datos de Prueba', icon: '🗄️' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl">⚙️</div>
            <div>
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
              <p className="text-slate-300 text-sm mt-0.5">Monitoreo y gestión del sistema · {usuario?.nombre}</p>
            </div>
            {agentStatus && (
              <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                agentStatus.agent_ready
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${agentStatus.agent_ready ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {agentStatus.agent_ready ? 'Agente activo' : 'Agente no iniciado'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Alerta si agente no está listo */}
        {agentStatus && !agentStatus.agent_ready && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">🚨</span>
            <div>
              <p className="font-semibold text-red-800 text-sm">El agente IA no está inicializado</p>
              <p className="text-red-600 text-xs mt-0.5">
                {agentStatus.init_error
                  ? `Error: ${agentStatus.init_error}`
                  : 'Falta configurar las variables de entorno en Railway (OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_URL, etc.)'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTabActiva(key)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-all ${
                tabActiva === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Tab Resumen */}
        {tabActiva === 'resumen' && (
          <div>
            {cargando ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border border-slate-100" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {stats.slice(0, 4).map(({ label, value, icon, ring, badge }) => (
                    <div key={label} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ring-1 ${ring}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl">{icon}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{label.split(' ')[0]}</span>
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {stats.slice(4).map(({ label, value, icon, ring, badge }) => (
                    <div key={label} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ring-1 ${ring}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl">{icon}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>KPI</span>
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-sm font-bold text-amber-900 mb-3">🔑 Credenciales de demo</p>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    {[
                      { rol: 'Admin', user: 'Admin', pass: '1234', path: '/admin', color: 'text-violet-700' },
                      { rol: 'Consejero', user: 'consejero@ucen.cl', pass: 'demo2025', path: '/dashboard', color: 'text-cyan-700' },
                      { rol: 'Estudiante', user: 'cualquier email', pass: 'cualquier clave', path: '/estudiante', color: 'text-emerald-700' },
                    ].map(({ rol, user, pass, path, color }) => (
                      <div key={rol} className="bg-white rounded-xl p-3 border border-amber-100">
                        <p className={`font-bold mb-1 ${color}`}>{rol}</p>
                        <p className="text-amber-700 font-mono">{user}</p>
                        <p className="text-amber-700 font-mono">{pass}</p>
                        <p className="text-amber-400 font-mono mt-1">{path}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab API */}
        {tabActiva === 'api' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🔌 Documentación de la API</h2>

              <div className="space-y-3">
                {[
                  { label: 'Swagger UI', url: swaggerUrl, desc: 'Prueba interactiva de todos los endpoints', icon: '📖', color: 'bg-indigo-600' },
                  { label: 'ReDoc', url: redocUrl, desc: 'Documentación detallada en formato ReDoc', icon: '📄', color: 'bg-slate-700' },
                  { label: 'Backend URL', url: apiUrl, desc: 'URL base del backend en Railway', icon: '🚂', color: 'bg-emerald-600' },
                ].map(({ label, url, desc, icon, color }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                  >
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-white text-base flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 truncate">{url}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">→</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-3">📡 Endpoints principales</h2>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { method: 'GET', path: '/', desc: 'Health check + estado del agente', color: 'bg-emerald-100 text-emerald-700' },
                  { method: 'POST', path: '/query', desc: 'Consulta al orquestador RAG', color: 'bg-indigo-100 text-indigo-700' },
                  { method: 'POST', path: '/scoring', desc: 'Score ML de un estudiante', color: 'bg-indigo-100 text-indigo-700' },
                  { method: 'GET', path: '/estudiantes', desc: 'Listado con filtros de riesgo', color: 'bg-emerald-100 text-emerald-700' },
                  { method: 'GET', path: '/estudiante/{id}', desc: 'Ficha completa del estudiante', color: 'bg-emerald-100 text-emerald-700' },
                  { method: 'POST', path: '/intervencion', desc: 'Registrar nueva intervención', color: 'bg-indigo-100 text-indigo-700' },
                  { method: 'GET', path: '/intervenciones', desc: 'Historial de intervenciones', color: 'bg-emerald-100 text-emerald-700' },
                  { method: 'GET', path: '/citas', desc: 'Agenda de citas', color: 'bg-emerald-100 text-emerald-700' },
                  { method: 'POST', path: '/cita', desc: 'Agendar nueva cita', color: 'bg-indigo-100 text-indigo-700' },
                  { method: 'GET', path: '/admin/reporteria', desc: 'KPIs institucionales', color: 'bg-emerald-100 text-emerald-700' },
                ].map(({ method, path, desc, color }) => (
                  <div key={path} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${color} w-10 text-center flex-shrink-0`}>{method}</span>
                    <span className="text-slate-700 w-44 flex-shrink-0">{path}</span>
                    <span className="text-slate-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5">
              <p className="text-slate-400 text-xs mb-2"># Ejemplo de consulta al agente</p>
              <pre className="text-emerald-400 text-xs leading-relaxed overflow-x-auto">{`curl -X POST ${apiUrl}/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "¿Qué becas están disponibles?",
    "rol_consultante": "estudiante"
  }'`}</pre>
            </div>
          </div>
        )}

        {/* Tab Feedback */}
        {tabActiva === 'feedback' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-bold text-slate-800 mb-1">Registrar Observación</h2>
            <p className="text-sm text-slate-500 mb-5">Documenta eventos o novedades relevantes de un estudiante.</p>
            {feedbackEnviado && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3">✅ Observación registrada.</div>
            )}
            <div className="space-y-4">
              {[
                { key: 'estudiante_id' as const, label: 'ID del Estudiante', placeholder: 'UUID del estudiante', required: true },
                { key: 'consejero_id' as const, label: 'ID del Consejero', placeholder: usuario?.id ?? 'UUID del consejero (opcional)', required: false },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={feedback[key]}
                    onChange={(e) => setFeedback((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Observación <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={feedback.observacion}
                  onChange={(e) => setFeedback((p) => ({ ...p, observacion: e.target.value }))}
                  rows={4}
                  placeholder="Describe la situación del estudiante..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={enviarFeedback}
              disabled={enviandoFeedback || !feedback.estudiante_id || !feedback.observacion}
              className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {enviandoFeedback ? 'Enviando...' : 'Registrar observación'}
            </button>
          </div>
        )}

        {/* Tab Seed */}
        {tabActiva === 'seed' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-bold text-slate-800 mb-1">Datos de Prueba (Seed)</h2>
            <p className="text-sm text-slate-500 mb-5">
              Genera 500 estudiantes ficticios, 10 consejeros, intervenciones y scores ML en Supabase.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 mb-5 font-mono text-sm">
              <p className="text-slate-400 text-xs mb-1"># Desde la raíz del proyecto</p>
              <p className="text-emerald-400">python -m src.db.seed</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Requisito previo</p>
              <p>El seed requiere <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en tu <code className="bg-amber-100 px-1 rounded">.env</code>.<br />
              Obtén la clave en: <strong>Supabase → Project Settings → API → service_role</strong></p>
            </div>
            <div className="space-y-1.5">
              {[
                '500 estudiantes (30% alto · 40% medio · 30% bajo riesgo)',
                '5 carreras: Ing. Civil, Pedagogía, Enfermería, Adm., Derecho',
                '10 consejeros + 20 docentes',
                '3 semestres de historial por estudiante',
                '80 intervenciones para estudiantes de riesgo alto',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
