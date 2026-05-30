import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SemaforoRiesgo from '../components/SemaforoRiesgo'
import ChatbotWidget from '../components/ChatbotWidget'
import { useApp } from '../context/AppContext'

export default function DashboardEstudiante() {
  const { usuario, apiUrl } = useApp()
  const navigate = useNavigate()
  const [info, setInfo] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
  }, [usuario])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            Bienvenido/a, {usuario?.nombre}
          </h1>
          <p className="text-slate-500 text-sm">
            Aquí puedes consultar tu situación académica y acceder a recursos de apoyo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: '📚', label: 'Reglamento Académico', desc: 'Consulta normas y requisitos' },
            { icon: '💰', label: 'Becas y Beneficios', desc: 'Explora apoyos disponibles' },
            { icon: '🧑‍⚕️', label: 'Apoyo Psicológico', desc: 'Habla con un profesional' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="font-medium text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
          <p className="font-medium mb-1">¿Tienes dudas?</p>
          <p>Usa el chatbot en la esquina inferior derecha para consultar sobre tu situación académica, becas o procesos de apoyo.</p>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  )
}
