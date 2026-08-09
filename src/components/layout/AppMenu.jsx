import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import Button from '../ui/Button'

const itemClassName = (danger) =>
  `rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors hover:bg-amber-50 ${
    danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-800'
  }`

export default function AppMenu({ open, onClose, items = [] }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      onClick={onClose}
    >
      <div
        className="flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-lg font-bold text-slate-800">Menu</p>
          <Button
            variant="ghost"
            className="h-10 w-10 !rounded-full px-0"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 pb-6">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No items yet</p>
          ) : (
            items.map((item) =>
              item.to ? (
                <Link
                  key={item.id}
                  to={item.to}
                  className={itemClassName(item.danger)}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className={itemClassName(item.danger)}
                  onClick={() => {
                    item.onClick?.()
                    onClose()
                  }}
                >
                  {item.label}
                </button>
              ),
            )
          )}
        </nav>
      </div>
    </div>
  )
}
