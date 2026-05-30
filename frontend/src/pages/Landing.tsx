import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

export default function Landing() {
  const { setUsuario } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const ingresar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    setTimeout(() => {
      setCargando(false)
      if (email === 'Admin' && password === '1234') {
        setUsuario({ email: 'admin@ucen.cl', nombre: 'Administrador', rol: 'admin' })
        navigate('/admin')
        return
      }
      if (email === 'consejero@ucen.cl' && password === 'demo2025') {
        setUsuario({ email, nombre: 'Consejero Demo', rol: 'consejero' })
        navigate('/dashboard')
        return
      }
      if (email && password) {
        setUsuario({ email, nombre: email.split('@')[0], rol: 'estudiante' })
        navigate('/estudiante')
        return
      }
      setError('Ingresa un usuario y contraseña válidos.')
    }, 400)
  }

  const features = [
    { icon: '🧠', text: 'IA multiagente que detecta riesgo de deserción en tiempo real' },
    { icon: '📊', text: 'Dashboards diferenciados por rol: estudiante, consejero y admin' },
    { icon: '💬', text: 'Chatbot RAG con base de conocimiento institucional' },
  ]

  const credenciales = [
    { rol: 'Admin', user: 'Admin', pass: '1234', path: '/admin', color: 'bg-violet-500' },
    { rol: 'Consejero', user: 'consejero@ucen.cl', pass: 'demo2025', path: '/dashboard', color: 'bg-cyan-500' },
    { rol: 'Estudiante', user: 'cualquier email', pass: 'cualquier clave', path: '/estudiante', color: 'bg-emerald-500' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* decoración de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-indigo-400 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-cyan-400 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-indigo-400 rounded-xl flex items-center justify-center text-xl">
              🎓
            </div>
            <span className="text-white font-bold text-xl tracking-tight">ConsultorEstudiantilIA</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Prevención de deserción<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300">
              impulsada por IA
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">
            Sistema de orientación académica inteligente para la Universidad Central de Chile.
          </p>

          <div className="space-y-4">
            {features.map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">{icon}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-500 text-xs">© 2025 UCEN · Vicerrectoría Académica</p>
        </div>
      </div>

      {/* Panel derecho — Login */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-slate-50">
        <div className="max-w-md w-full mx-auto">
          {/* Logo móvil */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-indigo-800 text-lg">ConsultorEstudiantilIA</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-1">Bienvenido</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa con tus credenciales institucionales</p>

          <form onSubmit={ingresar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuario</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@ucen.cl o Admin"
                className="w-full border border-slate-300 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200 disabled:opacity-60 mt-2"
            >
              {cargando ? 'Verificando...' : 'Ingresar →'}
            </button>
          </form>

          {/* Credenciales demo */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Acceso de demostración</p>
            <div className="space-y-2">
              {credenciales.map(({ rol, user, pass, path, color }) => (
                <div
                  key={rol}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-indigo-300 transition"
                  onClick={() => { setEmail(user); setPassword(pass) }}
                >
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-700">{rol}</span>
                    <span className="text-xs text-slate-400 ml-2">{user} / {pass}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{path}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Haz clic en una fila para autocompletar.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
