import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChatbotWidget from '../components/ChatbotWidget'
import { useApp } from '../context/AppContext'

const abrirChatbot = (query: string) => {
  window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { query } }))
}

const recursos = [
  {
    icon: '📋',
    title: 'Reglamento Académico',
    desc: 'Normas de evaluación, créditos, eliminación y procedimientos.',
    query: '¿Cuáles son las normas académicas principales? ¿Qué pasa si reprobo muchos ramos?',
    color: 'from-indigo-500 to-indigo-700',
    tag: 'Normativa',
  },
  {
    icon: '💰',
    title: 'Becas y Beneficios',
    desc: 'Becas JUNAEB, Beca Bicentenario, CAE y beneficios internos UCEN.',
    query: '¿Qué becas y beneficios estudiantiles están disponibles en la UCEN?',
    color: 'from-cyan-500 to-cyan-700',
    tag: 'Financiero',
  },
  {
    icon: '🧠',
    title: 'Apoyo Psicológico',
    desc: 'Orientación y atención psicológica gratuita para estudiantes.',
    query: '¿Cómo puedo acceder al apoyo psicológico? ¿Qué servicios de bienestar ofrece la UCEN?',
    color: 'from-violet-500 to-violet-700',
    tag: 'Bienestar',
  },
  {
    icon: '📅',
    title: 'Citas y Consejería',
    desc: 'Reserva una hora con tu consejero académico.',
    query: '¿Cómo agendo una cita con mi consejero académico?',
    color: 'from-emerald-500 to-emerald-700',
    tag: 'Agenda',
  },
  {
    icon: '🎓',
    title: 'Tutorías entre Pares',
    desc: 'Apoyo gratuito en matemáticas, física, inglés y más.',
    query: '¿Cómo puedo acceder a las tutorías entre pares del CAA?',
    color: 'from-amber-500 to-orange-600',
    tag: 'Apoyo Académico',
  },
  {
    icon: '📊',
    title: 'Mi Riesgo Académico',
    desc: '¿Qué factores afectan mi score de riesgo de deserción?',
    query: '¿Qué factores determinan el riesgo de deserción? ¿Cómo puedo mejorar mi situación académica?',
    color: 'from-rose-500 to-red-700',
    tag: 'Diagnóstico',
  },
]

export default function DashboardEstudiante() {
  const { usuario } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
  }, [usuario])

  const nombreCorto = usuario?.nombre?.split(' ')[0] ?? 'Estudiante'

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-cyan-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl flex-shrink-0">
              👋
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hola, {nombreCorto}</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Te acompañamos en tu trayectoria académica</p>
            </div>
          </div>

          {/* CTA principal */}
          <button
            onClick={() => abrirChatbot('Hola, ¿cómo puedo ayudarte hoy?')}
            className="w-full sm:w-auto flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur rounded-2xl px-5 py-4 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
              💬
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Consultar al Asistente IA</p>
              <p className="text-indigo-200 text-xs">Becas, reglamento, bienestar y más</p>
            </div>
            <span className="ml-auto text-white/40 group-hover:text-white/80 text-xl transition-colors">→</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Recursos y servicios disponibles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recursos.map(({ icon, title, desc, query, color, tag }) => (
            <button
              key={title}
              onClick={() => abrirChatbot(query)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group text-left"
            >
              <div className={`bg-gradient-to-br ${color} p-4 flex items-center justify-between`}>
                <span className="text-3xl">{icon}</span>
                <span className="text-xs font-semibold text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
                <p className="text-xs text-indigo-500 mt-2 font-medium group-hover:text-indigo-700 transition-colors">
                  Consultar →
                </p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-8">
          🔒 Tu información es confidencial y solo accesible por consejeros autorizados.
        </p>
      </div>

      <ChatbotWidget />
    </div>
  )
}
