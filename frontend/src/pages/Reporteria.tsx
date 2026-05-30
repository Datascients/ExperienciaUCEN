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
  por_carrera?: Record<string, { total: number; alto: number }>
}

export default function Reporteria() {
  const { apiUrl, usuario } = useApp()
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KPIs>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuario) { navigate('/'); return }
    if (usuario.rol === 'estudiante') { navigate('/estudiante'); return }
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await fetch(`${apiUrl}/admin/reporteria`)
      if (res.ok) {
        const data = await res.json()
        setKpis(data)
      }
    } catch {
      /* no-op */
    } finally {
      setCargando(false)
    }
  }

  const totalEst = kpis.total_estudiantes ?? 0
  const pct = (n?: number) => totalEst > 0 && n !== undefined ? ((n / totalEst) * 100).toFixed(1) : '—'

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Reportería Institucional</h1>
          <button
            onClick={cargar}
            className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="text-slate-400 text-center py-16">Cargando KPIs...</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Estudiantes', value: kpis.total_estudiantes ?? '—', sub: 'matriculados activos', color: 'text-slate-800' },
                { label: 'Riesgo Alto', value: kpis.riesgo_alto ?? '—', sub: `${pct(kpis.riesgo_alto)}% del total`, color: 'text-red-600' },
                { label: 'Riesgo Medio', value: kpis.riesgo_medio ?? '—', sub: `${pct(kpis.riesgo_medio)}% del total`, color: 'text-yellow-600' },
                { label: 'Riesgo Bajo', value: kpis.riesgo_bajo ?? '—', sub: `${pct(kpis.riesgo_bajo)}% del total`, color: 'text-green-600' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Intervenciones y retención */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-2xl font-bold text-indigo-600">{kpis.intervenciones_pendientes ?? '—'}</p>
                <p className="text-sm font-medium text-slate-700 mt-1">Intervenciones pendientes</p>
                <p className="text-xs text-slate-400 mt-0.5">requieren seguimiento</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-2xl font-bold text-green-600">{kpis.intervenciones_exitosas ?? '—'}</p>
                <p className="text-sm font-medium text-slate-700 mt-1">Intervenciones exitosas</p>
                <p className="text-xs text-slate-400 mt-0.5">completadas con éxito</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-2xl font-bold text-blue-600">
                  {kpis.tasa_retencion !== undefined ? `${(kpis.tasa_retencion * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">Tasa de retención</p>
                <p className="text-xs text-slate-400 mt-0.5">período actual</p>
              </div>
            </div>

            {/* Por carrera */}
            {kpis.por_carrera && Object.keys(kpis.por_carrera).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-700 mb-4">Distribución por Carrera</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 font-medium text-slate-600">Carrera</th>
                        <th className="text-right py-2 font-medium text-slate-600">Total</th>
                        <th className="text-right py-2 font-medium text-slate-600">Riesgo Alto</th>
                        <th className="text-right py-2 font-medium text-slate-600">% Riesgo</th>
                        <th className="py-2 pl-4 font-medium text-slate-600 text-left">Barra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(kpis.por_carrera).map(([carrera, data]) => {
                        const pctAlto = data.total > 0 ? (data.alto / data.total) * 100 : 0
                        const barColor = pctAlto >= 30 ? 'bg-red-400' : pctAlto >= 15 ? 'bg-yellow-400' : 'bg-green-400'
                        return (
                          <tr key={carrera}>
                            <td className="py-2 text-slate-800">{carrera}</td>
                            <td className="py-2 text-right text-slate-600">{data.total}</td>
                            <td className="py-2 text-right text-red-600 font-medium">{data.alto}</td>
                            <td className="py-2 text-right text-slate-500">{pctAlto.toFixed(1)}%</td>
                            <td className="py-2 pl-4">
                              <div className="w-32 bg-slate-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${barColor}`}
                                  style={{ width: `${Math.min(pctAlto, 100)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sin datos */}
            {!kpis.total_estudiantes && !cargando && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                <p className="text-slate-400 text-sm">No hay datos disponibles. Ejecuta el seed o conecta Supabase.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
