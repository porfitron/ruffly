import { Bone, Package, Plane, Utensils } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Pup', icon: Bone },
  { id: 'pantry', label: 'Pantry', icon: Package },
  { id: 'bowl', label: 'Bowl', icon: Utensils },
  { id: 'trip', label: 'Trip', icon: Plane },
]

export default function Navigation({ activeTab, onChange }) {
  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 border-t border-amber-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  active ? 'text-[#F59E0B]' : 'text-slate-400'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
