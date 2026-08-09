/** Progress ring showing meal + treat calories vs DER */
export default function CalorieRing({
  allocatedPercent = 0,
  mealPercent = 0,
  treatPercent = 0,
  allocatedKcal = 0,
  targetKcal = 0,
  size = 168,
  label = null,
}) {
  const stroke = size >= 160 ? 12 : 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const mealP = Math.max(Number(mealPercent) || 0, 0)
  const treatP = Math.max(Number(treatPercent) || 0, 0)
  const totalP = mealP + treatP

  // Keep segments within the ring when over-allocated
  let mealDisplay = mealP
  let treatDisplay = treatP
  if (totalP > 100 && totalP > 0) {
    mealDisplay = (mealP / totalP) * 100
    treatDisplay = (treatP / totalP) * 100
  }

  const mealLength = (Math.min(mealDisplay, 100) / 100) * circumference
  const treatLength = (Math.min(treatDisplay, 100 - mealDisplay) / 100) * circumference

  const status =
    allocatedPercent === 0
      ? 'empty'
      : allocatedPercent > 100
        ? 'over'
        : allocatedPercent >= 98
          ? 'balanced'
          : 'under'

  const mealColor = {
    empty: '#CBD5E1',
    under: '#10B981',
    balanced: '#10B981',
    over: '#F43F5E',
  }[status]
  const treatColor = '#F97316'

  function segmentProps(length, startOffset) {
    if (length <= 0) return null
    return {
      strokeDasharray: `${length} ${Math.max(circumference - length, 0)}`,
      strokeDashoffset: -startOffset,
    }
  }

  const mealSeg = segmentProps(mealLength, 0)
  const treatSeg = segmentProps(treatLength, mealLength)
  const useRoundCaps = treatLength <= 0 || mealLength <= 0

  return (
    <div className="flex flex-col items-center gap-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      ) : null}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={stroke}
          />
          {mealSeg ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={mealColor}
              strokeWidth={stroke}
              strokeLinecap={useRoundCaps ? 'round' : 'butt'}
              className="transition-[stroke-dashoffset,stroke-dasharray,stroke] duration-300"
              {...mealSeg}
            />
          ) : null}
          {treatSeg ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={treatColor}
              strokeWidth={stroke}
              strokeLinecap={useRoundCaps ? 'round' : 'butt'}
              className="transition-[stroke-dashoffset,stroke-dasharray,stroke] duration-300"
              {...treatSeg}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={`font-extrabold text-slate-800 ${size >= 160 ? 'text-3xl' : 'text-2xl'}`}
          >
            {Math.round(allocatedPercent)}%
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {Math.round(allocatedKcal)} / {Math.round(targetKcal)} kcal
          </p>
        </div>
      </div>
    </div>
  )
}
