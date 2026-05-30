interface Props {
  nivel: 'alto' | 'medio' | 'bajo' | string
  score?: number
  size?: 'sm' | 'md' | 'lg'
}

const CONFIG = {
  alto:  { color: 'bg-red-500',    text: 'text-red-700',    label: 'Riesgo Alto',  badge: 'bg-red-100 text-red-800' },
  medio: { color: 'bg-yellow-400', text: 'text-yellow-700', label: 'Riesgo Medio', badge: 'bg-yellow-100 text-yellow-800' },
  bajo:  { color: 'bg-green-500',  text: 'text-green-700',  label: 'Riesgo Bajo',  badge: 'bg-green-100 text-green-800' },
}

export default function SemaforoRiesgo({ nivel, score, size = 'md' }: Props) {
  const config = CONFIG[nivel as keyof typeof CONFIG] ?? CONFIG.bajo
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium ${config.badge} ${textSize}`}>
      <span className={`rounded-full ${config.color} ${dotSize} animate-pulse`} />
      {config.label}
      {score !== undefined && <span className="opacity-70">({(score * 100).toFixed(0)}%)</span>}
    </span>
  )
}
