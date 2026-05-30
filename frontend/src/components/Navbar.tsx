import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const LINKS_CONSEJERO = [
  { to: '/dashboard', label: 'Estudiantes' },
  { to: '/reporteria', label: 'Reportería' },
  { to: '/agendamiento', label: 'Agenda' },
]

const LINKS_ADMIN = [
  { to: '/admin', label: 'Panel Admin' },
  { to: '/reporteria', label: 'Reportería' },
]

export default function Navbar() {
  const { usuario, setUsuario } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const links =
    usuario?.rol === 'admin' ? LINKS_ADMIN
    : usuario?.rol === 'consejero' ? LINKS_CONSEJERO
    : []

  const initiales = usuario?.nombre
    ? usuario.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const avatarColor =
    usuario?.rol === 'admin' ? 'bg-violet-600'
    : usuario?.rol === 'consejero' ? 'bg-cyan-600'
    : 'bg-emerald-600'

  const cerrarSesion = () => {
    setUsuario(null)
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-lg flex items-center justify-center text-sm">
            🎓
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-indigo-700 transition-colors">
            ConsultorEstudiantilIA
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                location.pathname === to
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {usuario && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                {initiales}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-none">{usuario.nombre}</p>
                <p className="text-xs text-slate-400 capitalize leading-none mt-0.5">{usuario.rol}</p>
              </div>
            </div>
            <button
              onClick={cerrarSesion}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1"
              title="Cerrar sesión"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
