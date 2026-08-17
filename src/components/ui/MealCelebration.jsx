import { useEffect, useMemo, useRef } from 'react'

const DURATION_MS = 2800
const COLS = 12
const ROWS = 5

const THEMES = {
  sun: {
    emoji: '☀️',
    label: 'Breakfast done',
    wash: 'bg-gradient-to-b from-amber-200/85 via-orange-200/75 to-yellow-100/80',
  },
  moon: {
    emoji: '🌙',
    label: 'Evening done',
    wash: 'bg-gradient-to-b from-indigo-950/90 via-slate-900/88 to-violet-950/85',
  },
  tongue: {
    emoji: '👅',
    label: 'New pup saved',
    wash: 'bg-gradient-to-b from-rose-200/90 via-pink-200/80 to-orange-100/85',
  },
  allDone: {
    emoji: '👅',
    label: 'All done for today',
    wash: 'bg-gradient-to-b from-rose-200/90 via-pink-200/80 to-orange-100/85',
  },
  play: {
    emoji: '🎾',
    label: 'Play logged',
    wash: 'bg-gradient-to-b from-lime-300/90 via-yellow-200/80 to-emerald-100/85',
  },
}

function makeBursts() {
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    return {
      id: i,
      left: `${((col + Math.random()) / COLS) * 100}%`,
      start: `${-8 - row * 6 - Math.random() * 18}vh`,
      delay: row * 0.07 + Math.random() * 0.18,
      duration: 1.55 + Math.random() * 1.05,
      size: `${1.15 + Math.random() * 2.35}rem`,
      drift: `${-56 + Math.random() * 112}px`,
      spin: `${(Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 420)}deg`,
    }
  })
}

/** Full-screen emoji burst for meal check-off, all-done, and new-pup save. */
export default function MealCelebration({ playId, theme = 'sun', onDone }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const bursts = useMemo(() => (playId ? makeBursts() : []), [playId])
  const { emoji, label, wash } = THEMES[theme] ?? THEMES.sun

  useEffect(() => {
    if (!playId) return undefined
    const timer = window.setTimeout(() => onDoneRef.current?.(), DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [playId])

  if (!playId) return null

  return (
    <div
      className="ruffly-celebrate fixed inset-0 z-[100] overflow-hidden print:hidden"
      role="status"
      aria-live="polite"
      aria-label={label}
      onClick={() => onDoneRef.current?.()}
    >
      <div
        className={`ruffly-celebrate-wash pointer-events-none absolute inset-0 ${wash}`}
      />
      <span
        className="ruffly-celebrate-pop pointer-events-none absolute left-1/2 top-1/2 select-none drop-shadow-sm"
        aria-hidden
      >
        {emoji}
      </span>
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="ruffly-celebrate-fall pointer-events-none absolute select-none leading-none"
          style={{
            left: burst.left,
            top: burst.start,
            fontSize: burst.size,
            animationDelay: `${burst.delay}s`,
            animationDuration: `${burst.duration}s`,
            '--celebrate-drift': burst.drift,
            '--celebrate-spin': burst.spin,
          }}
          aria-hidden
        >
          {emoji}
        </span>
      ))}
    </div>
  )
}
