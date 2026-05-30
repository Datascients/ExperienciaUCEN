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
  }, [mensajes, cargando])

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
        { rol: 'asistente', contenido: '⚠️ Error al conectar con el servidor. Intenta nuevamente.' },
      ])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {abierto && (
        <div
          className="w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3"
          style={{ height: 460 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🤖</div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">Asistente IA</p>
                <p className="text-indigo-200 text-xs mt-0.5">ConsultorEstudiantilIA</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-white/60 hover:text-white text-xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {mensajes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl mb-3">
                  💬
                </div>
                <p className="text-sm font-medium text-slate-700">¿En qué puedo ayudarte?</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pregunta sobre becas, reglamento o tu situación académica.
                </p>
              </div>
            )}

            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.rol === 'asistente' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">
                    🤖
                  </div>
                )}
                <div className={`max-w-[78%] ${m.rol === 'usuario' ? 'order-first' : ''}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.rol === 'usuario'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.contenido}</p>
                  </div>
                  {m.escalar && (
                    <div className="mt-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                      🚨 Derivado a consejero humano
                    </div>
                  )}
                  {m.fuentes && m.fuentes.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400 px-1">
                      📎 {m.fuentes[0].documento}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-3 flex gap-2 bg-white flex-shrink-0">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-slate-50"
              placeholder="Escribe tu consulta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
            />
            <button
              onClick={enviar}
              disabled={cargando || !input.trim()}
              className="bg-indigo-600 text-white text-sm px-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
            >
              →
            </button>
          </div>
        </div>
      )}

      <button
        id="chatbot-toggle"
        onClick={() => setAbierto((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-2xl transition-all hover:scale-105 active:scale-95 ${
          abierto
            ? 'bg-slate-700 rotate-180'
            : 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-300'
        }`}
        aria-label="Abrir asistente IA"
      >
        {abierto ? '✕' : '💬'}
      </button>
    </div>
  )
}
