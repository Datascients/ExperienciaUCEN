import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

interface Mensaje {
  rol: 'usuario' | 'asistente'
  contenido: string
  fuentes?: { documento: string; seccion: string }[]
  escalar?: boolean
}

interface Props {
  estudianteId?: string
}

export default function ChatbotWidget({ estudianteId }: Props) {
  const { usuario, apiUrl } = useApp()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || cargando) return

    setMensajes((prev) => [...prev, { rol: 'usuario', contenido: texto }])
    setInput('')
    setCargando(true)

    try {
      const res = await fetch(`${apiUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: texto,
          estudiante_id: estudianteId,
          rol_consultante: usuario?.rol ?? 'estudiante',
        }),
      })
      const data = await res.json()
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'asistente',
          contenido: data.respuesta ?? 'Sin respuesta.',
          fuentes: data.fuentes ?? [],
          escalar: data.escalar_a_consejero,
        },
      ])
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: 'asistente', contenido: 'Error al conectar con el servidor.' },
      ])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {abierto && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3" style={{ height: 420 }}>
          <div className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-sm">ConsultorEstudiantilIA</span>
            <button onClick={() => setAbierto(false)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mensajes.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-8">
                Hola, ¿en qué puedo ayudarte hoy?
              </p>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.rol === 'usuario'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <p className="whitespace-pre-wrap">{m.contenido}</p>
                  {m.escalar && (
                    <p className="mt-1 text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-1">
                      Derivado a consejero humano
                    </p>
                  )}
                  {m.fuentes && m.fuentes.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      Fuente: {m.fuentes[0].documento}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-xl px-3 py-2 text-sm text-slate-400">
                  Consultando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-2 flex gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Escribe tu consulta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
            />
            <button
              onClick={enviar}
              disabled={cargando}
              className="bg-indigo-600 text-white text-sm px-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-14 h-14 bg-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-indigo-800 transition-colors"
        aria-label="Abrir chatbot"
      >
        💬
      </button>
    </div>
  )
}
