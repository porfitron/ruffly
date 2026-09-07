/** Dual-thumb date range — same control Search uses for log filters. */
export const DATE_RANGE_DAYS = 14
/** Matches the slider thumb width, so the gold fill lines up with the circles. */
const THUMB_PX = 24

const RANGE_INPUT_CLASS = [
  'pointer-events-none absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 appearance-none bg-transparent',
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#F59E0B] [&::-webkit-slider-thumb]:shadow-md',
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#F59E0B]',
].join(' ')

/** Thumb centres sit half a thumb inside each end, so offset the fill to match. */
function thumbOffset(percent) {
  return `calc(${percent}% + ${(0.5 - percent / 100) * THUMB_PX}px)`
}

export default function DateRangeSlider({
  start,
  end,
  onChange,
  startLabel,
  endLabel,
  max = DATE_RANGE_DAYS,
  startAriaLabel = 'Start date',
  endAriaLabel = 'End date',
}) {
  const startPercent = max === 0 ? 0 : (start / max) * 100
  const endPercent = max === 0 ? 0 : (end / max) * 100
  const spanPercent = endPercent - startPercent

  return (
    <div>
      <div className="relative h-11">
        <div className="absolute left-3 right-3 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-amber-100" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#F59E0B]"
          style={{
            left: thumbOffset(startPercent),
            width: `calc(${spanPercent}% - ${(spanPercent / 100) * THUMB_PX}px)`,
          }}
        />
        {/* Dragging one circle past the other pushes it, so neither can stick. */}
        <input
          type="range"
          min={0}
          max={max}
          value={start}
          onChange={(e) => {
            const next = Number(e.target.value)
            onChange([next, Math.max(end, next)])
          }}
          className={RANGE_INPUT_CLASS}
          // Both circles sit on the right until dragged, so start needs the top layer.
          style={{ zIndex: start === max ? 2 : 1 }}
          aria-label={startAriaLabel}
          aria-valuetext={startLabel}
        />
        <input
          type="range"
          min={0}
          max={max}
          value={end}
          onChange={(e) => {
            const next = Number(e.target.value)
            onChange([Math.min(start, next), next])
          }}
          className={RANGE_INPUT_CLASS}
          style={{ zIndex: 1 }}
          aria-label={endAriaLabel}
          aria-valuetext={endLabel}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}
