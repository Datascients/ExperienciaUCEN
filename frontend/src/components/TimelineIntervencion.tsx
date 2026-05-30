interface Intervencion {
  id: string
  tipo: string
  estado: string
  notas?: string
  created_at: string
}

interface Props {
  intervenciones: Intervencion[]
}

const ESTADO_COLOR: Record<string, string> = {
  exitosa:     'bg-green-100 text-green-800',
  pendiente:   'bg-yellow-100 text-yellow-800',
  no_contacto: 'bg-red-100 text-red-800',
  derivada:    'bg-blue-100 text-blue-800',
}

export default function TimelineIntervencion({ intervenciones }: Props) {
  if (!intervenciones.length) {
    return <p className="text-sm text-slate-400">Sin intervenciones registradas.</p>
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-4 pl-4">
      {intervenciones.map((iv) => (
        <li key={iv.id} className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white" />
          <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium capitalize">{iv.tipo.replace('_', ' ')}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[iv.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                {iv.estado}
              </span>
            </div>
            {iv.notas && <p className="text-xs text-slate-500">{iv.notas}</p>}
            <p className="text-xs text-slate-400 mt-1">
              {new Date(iv.created_at).toLocaleDateString('es-CL')}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
