import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

export default function Landing() {
  const { setUsuario } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const ingresar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (email === 'Admin' && password === '1234') {
      setUsuario({ email: 'admin@uai.cl', nombre: 'Administrador', rol: 'admin' })
      navigate('/admin')
      return
    }
    if (email === 'consejero@uai.cl' && password === 'demo2025') {
      setUsuario({ email, nombre: 'Consejero Demo', rol: 'consejero' })
      navigate('/dashboard')
      return
    }
    if (email && password) {
      setUsuario({ email, nombre: email.split('@')[0], rol: 'estudiante' })
      navigate('/estudiante')
      return
    }
    setError('Ingresa un email y contraseña.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold text-indigo-800">ConsultorEstudiantilIA</h1>
          <p className="text-slate-500 text-sm mt-1">
            Sistema de prevención de deserción estudiantil
          </p>
        </div>

        <form onSubmit={ingresar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@uai.cl o Admin"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-700 text-white font-medium py-2 rounded-lg hover:bg-indigo-800 transition-colors"
          >
            Ingresar
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400 space-y-1">
          <p><strong>Admin:</strong> Admin / 1234</p>
          <p><strong>Consejero:</strong> consejero@uai.cl / demo2025</p>
          <p><strong>Estudiante:</strong> cualquier email / cualquier contraseña</p>
        </div>
      </div>
    </div>
  )
}
