import { useState } from 'react'
import { House, Plane, Utensils } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import DogAvatar from '../profile/DogAvatar'
import DogSwitchSheet from '../profile/DogSwitchSheet'

const TABS = [
  { id: 'profile', label: 'Home', icon: House },
  { id: 'bowl', label: 'Bowl', icon: Utensils },
  { id: 'trip', label: 'Trip', icon: Plane },
]

export default function Navigation({ activeTab, onChange, onAddDog }) {
  const { activeDog } = useApp()
  const [switchOpen, setSwitchOpen] = useState(false)
  const hasActivePup = Boolean(activeDog?.name?.trim())
  const dogLabel = hasActivePup ? activeDog.name.trim() : 'Pup'

  return (
    <>
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
          <li>
            <button
              type="button"
              onClick={() => setSwitchOpen(true)}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold text-slate-400 transition-colors"
              aria-label={
                hasActivePup ? `Switch pup — ${dogLabel}` : 'Pup — add or switch'
              }
              aria-haspopup="dialog"
              aria-expanded={switchOpen}
            >
              <DogAvatar
                name={dogLabel}
                photoUrl={activeDog?.photoUrl}
                size="nav"
                ring={switchOpen}
              />
              <span className="max-w-[3.5rem] truncate">{dogLabel}</span>
            </button>
          </li>
        </ul>
      </nav>

      <DogSwitchSheet
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onAddDog={onAddDog}
      />
    </>
  )
}
