import { useMemo } from 'react'

const CONFETTI_COUNT = 34
const CONFETTI_COLORS = ['#facc15', '#22d3ee', '#38bdf8', '#6366f1', '#8b5cf6', '#ec4899', '#f97316']

export default function ConfettiBurst({ seed = 0, className = '' }) {
  const pieces = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }).map((_, index) => ({
      id: `${seed}-${index}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
      tilt: Math.random() * 360,
    }))
  }, [seed])

  const classes = ['spin-wheel__confetti', className].filter(Boolean).join(' ')

  return (
    <div className={classes} aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.45}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--confetti-rotate': `${piece.rotate}deg`,
            '--confetti-tilt': `${piece.tilt}deg`,
          }}
        />
      ))}
    </div>
  )
}
