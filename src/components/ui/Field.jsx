export const fieldClassName =
  'mt-1 h-12 w-full rounded-2xl border border-amber-200 bg-[#FBF9F5] px-4 text-slate-800 outline-none transition-colors focus:border-[#F59E0B]'

export function Field({ label, hint, children, className = '', htmlFor }) {
  return (
    <div className={`text-left ${className}`}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1 text-xs font-normal text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

export function SegmentedControl({ value, onChange, options, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="mt-1 grid gap-2 rounded-2xl bg-[#FBF9F5] p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-11 rounded-xl text-sm font-semibold transition-colors ${
              active
                ? 'bg-white text-[#F59E0B] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
