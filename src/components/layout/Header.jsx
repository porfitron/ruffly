import { useState } from 'react'
import { Menu } from 'lucide-react'
import AppMenu from './AppMenu'

export default function Header({
  title = 'Ruffly',
  subtitle,
  menuItems = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false)

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
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-[#F59E0B] shadow-sm hover:bg-amber-50"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} strokeWidth={2.5} />
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
