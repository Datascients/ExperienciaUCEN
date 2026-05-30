import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const LINKS_CONSEJERO = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/reporteria', label: 'Reportería' },
  { to: '/agendamiento', label: 'Agendamiento' },
]

const LINKS_ADMIN = [
  { to: '/admin', label: 'Panel Admin' },
  { to: '/reporteria', label: 'Reportería' },
]

export default function Navbar() {
  const { usuario } = useApp()
  const location = useLocation()

  const links =
    usuario?.rol === 'admin'
      ? LINKS_ADMIN
      : usuario?.rol === 'consejero'
      ? LINKS_CONSEJERO
      : []

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-indigo-700 text-lg tracking-tight">
        ConsultorEstudiantilIA
      </Link>
      <div className="flex items-center gap-4">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'text-indigo-700'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            {label}
          </Link>
        ))}
        {usuario && (
          <span className="text-xs text-slate-400 ml-4">
            {usuario.nombre} · <span className="capitalize">{usuario.rol}</span>
          </span>
        )}
      </div>
    </nav>
  )
}
