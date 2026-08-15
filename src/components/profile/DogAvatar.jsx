export function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Circular avatar — photo when set, else initials (one letter unless `initials` is passed). */
export default function DogAvatar({
  name = '',
  photoUrl = '',
  initials = '',
  size = 'md',
  className = '',
  ring = false,
}) {
  const initial =
    initials.trim() ||
    (name.trim() ? name.trim().charAt(0).toUpperCase() : '?')
  const sizeClass =
    size === 'nav'
      ? 'h-[22px] w-[22px] text-[10px]'
      : size === 'xs'
        ? 'h-7 w-7 text-xs'
        : size === 'sm'
          ? 'h-10 w-10 text-sm'
          : size === 'lg'
            ? 'h-16 w-16 text-2xl'
            : 'h-12 w-12 text-base'

  const ringClass = ring
    ? size === 'nav'
      ? 'outline outline-2 outline-[#F59E0B] outline-offset-1'
      : 'ring-2 ring-[#F59E0B] ring-offset-2 ring-offset-white'
    : ''

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        draggable={false}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${ringClass} ${className}`}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-amber-100 font-extrabold text-[#F59E0B] ${sizeClass} ${ringClass} ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  )
}
