export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary: 'bg-[#F59E0B] text-white hover:bg-amber-600',
    secondary: 'bg-white text-slate-800 border border-amber-200 hover:bg-amber-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-white/70',
    sage: 'bg-[#10B981] text-white hover:bg-emerald-600',
  }

  return (
    <button
      type={type}
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
