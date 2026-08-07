/** Progress ring showing meal calories vs DER */
export default function CalorieRing({
  allocatedPercent = 0,
  allocatedKcal = 0,
  targetKcal = 0,
}) {
  const size = 168
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(allocatedPercent, 0), 100)
  const offset = circumference - (clamped / 100) * circumference

  const status =
    allocatedPercent === 0
      ? 'empty'
      : allocatedPercent > 100
        ? 'over'
        : allocatedPercent >= 98
          ? 'balanced'
          : 'under'

  const strokeColor = {
    empty: '#FDE68A',
    under: '#F59E0B',
    balanced: '#10B981',
    over: '#F43F5E',
  }[status]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FDE68A"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-extrabold text-slate-800">
          {Math.round(allocatedPercent)}%
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {Math.round(allocatedKcal)} / {targetKcal} kcal
        </p>
      </div>
    </div>
  )
}
