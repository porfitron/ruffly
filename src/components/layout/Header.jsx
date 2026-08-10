import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import AppMenu from './AppMenu'

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'ME'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Header({
  title = 'Ruffly',
  subtitle,
  menuItems = [],
  menuBadge = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { ownerAccount } = useApp()
  const initials = initialsFromName(ownerAccount?.name)

  return (
    <>
      <header className="print:hidden flex items-start justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold tracking-tight text-[#F59E0B]">
              {title}
            </p>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F59E0B] ring-1 ring-amber-200/80">
              Free
            </span>
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-sm font-bold tracking-wide text-[#F59E0B] shadow-sm hover:bg-amber-100"
          aria-label={menuBadge ? 'Open menu (action needed)' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          {initials}
          {menuBadge ? (
            <span
              className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </button>
      </header>

      <AppMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />
    </>
  )
}
