import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

interface Mensaje {
  rol: 'usuario' | 'asistente'
  contenido: string
  fuentes?: { documento: string; seccion: string }[]
  escalar?: boolean
  error?: boolean
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

  // Escucha evento global para abrir con query pre-cargada
  useEffect(() => {
    const handler = (e: Event) => {
      const { query } = (e as CustomEvent).detail ?? {}
      setAbierto(true)
      if (query) {
        setInput(query)
        setTimeout(() => enviarTexto(query), 100)
      }
    }
    window.addEventListener('chatbot:open', handler)
    return () => window.removeEventListener('chatbot:open', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  const enviarTexto = async (texto: string) => {
    if (!texto.trim() || cargando) return
    setInput('')
    setMensajes((prev) => [...prev, { rol: 'usuario', contenido: texto }])
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

      if (!res.ok) {
        const detalle = data.detail ?? `Error ${res.status}`
        const esFaltaConfig = detalle.toLowerCase().includes('no inicializado') ||
          detalle.toLowerCase().includes('api_key') ||
          res.status === 503
        setMensajes((prev) => [
          ...prev,
          {
            rol: 'asistente',
            contenido: esFaltaConfig
              ? '⚙️ El asistente aún no está configurado. Un administrador debe completar las variables de entorno en Railway (OPENAI_API_KEY, PINECONE_API_KEY, etc.).'
              : `Error del servidor: ${detalle}`,
            error: true,
          },
        ])
        return
      }

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'asistente',
          contenido: data.respuesta ?? 'No obtuve respuesta. Intenta reformular tu pregunta.',
          fuentes: data.fuentes ?? [],
          escalar: data.escalar_a_consejero,
        },
      ])
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'asistente',
          contenido: '⚠️ No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.',
          error: true,
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  const enviar = () => enviarTexto(input.trim())

  const sugerencias = [
    '¿Qué becas están disponibles?',
    '¿Cómo evitar la eliminación académica?',
    '¿Qué pasa si reprobo más del 50%?',
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {abierto && (
        <div
          className="w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🤖</div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">Asistente IA · UCEN</p>
                <p className="text-indigo-200 text-xs mt-0.5">Consultas académicas y de bienestar</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-white/60 hover:text-white text-xl leading-none transition-colors w-7 h-7 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {mensajes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">💬</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">¿En qué puedo ayudarte?</p>
                  <p className="text-xs text-slate-400 mt-1">Consulta sobre becas, reglamento o bienestar</p>
                </div>
                <div className="w-full space-y-1.5">
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviarTexto(s)}
                      className="w-full text-left text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-slate-600"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.rol === 'asistente' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">
                    🤖
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.rol === 'usuario'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : m.error
                      ? 'bg-red-50 text-red-800 border border-red-100 rounded-bl-sm'
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
                      📎 Fuente: {m.fuentes[0].documento}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((d) => (
                      <div
                        key={d}
                        className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
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
              disabled={cargando}
            />
            <button
              onClick={enviar}
              disabled={cargando || !input.trim()}
              className="bg-indigo-600 text-white text-sm px-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button
        id="chatbot-toggle"
        onClick={() => setAbierto((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-2xl transition-all hover:scale-105 active:scale-95 ${
          abierto ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-300'
        }`}
        aria-label="Abrir asistente IA"
      >
        {abierto ? '✕' : '💬'}
      </button>
    </div>
  )
}
