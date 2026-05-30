import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChatbotWidget from '../components/ChatbotWidget'
import { useApp } from '../context/AppContext'

export default function DashboardEstudiante() {
  const { usuario } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
  }, [usuario])

  const recursos = [
    {
      icon: '📋', title: 'Reglamento Académico',
      desc: 'Consulta normas de evaluación, créditos, eliminación y procedimientos.',
      color: 'from-indigo-500 to-indigo-700',
    },
    {
      icon: '💰', title: 'Becas y Beneficios',
      desc: 'Explora becas disponibles, créditos JUNAEB y apoyos económicos.',
      color: 'from-cyan-500 to-cyan-700',
    },
    {
      icon: '🧠', title: 'Apoyo Psicológico',
      desc: 'Agenda una sesión con orientación estudiantil o psicología.',
      color: 'from-violet-500 to-violet-700',
    },
    {
      icon: '📅', title: 'Citas y Agenda',
      desc: 'Reserva hora con tu consejero académico o docente.',
      color: 'from-emerald-500 to-emerald-700',
    },
  ]

  const nombreCorto = usuario?.nombre?.split(' ')[0] ?? 'Estudiante'

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero personalizado */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-cyan-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl">
              👋
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hola, {nombreCorto}</h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                Estamos aquí para acompañarte en tu trayectoria académica.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* CTA Chatbot */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4 shadow-lg shadow-indigo-200">
          <div>
            <p className="text-white font-semibold">¿Tienes dudas académicas?</p>
            <p className="text-indigo-200 text-sm mt-0.5">
              Usa el asistente IA para consultar sobre becas, reglamento o tu situación.
            </p>
          </div>
          <button
            onClick={() => document.getElementById('chatbot-toggle')?.click()}
            className="flex-shrink-0 bg-white text-indigo-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Consultar →
          </button>
        </div>

        {/* Recursos */}
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Recursos disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recursos.map(({ icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-default"
            >
              <div className={`bg-gradient-to-br ${color} p-4 flex items-center justify-between`}>
                <span className="text-3xl">{icon}</span>
                <span className="text-white/40 text-2xl group-hover:text-white/70 transition-colors">→</span>
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-8">
          Tu información es confidencial y solo accesible por consejeros autorizados.
        </p>
      </div>

      <ChatbotWidget />
    </div>
  )
}
