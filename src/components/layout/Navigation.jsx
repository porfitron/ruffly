import { CalendarDays, Plus, Users } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import DogAvatar from '../profile/DogAvatar'

/**
 * Post-onboarding shell: Today | Log(+) | Pack
 * Dog management lives on Pack; account in the header menu.
 */
export default function Navigation({ activeTab, onChange, onLog }) {
  const { dogs } = useApp()
  const packLead = dogs[0]
  const hasPackPup = Boolean(packLead?.name?.trim())
  const dogLabel = hasPackPup ? packLead.name.trim() : 'Pack'

  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 border-t border-amber-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="relative mx-auto grid max-w-lg grid-cols-3 items-end">
        <button
          type="button"
          onClick={() => onChange('today')}
          className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
            activeTab === 'today' ? 'text-[#F59E0B]' : 'text-slate-400'
          }`}
        >
          <CalendarDays
            size={22}
            strokeWidth={activeTab === 'today' ? 2.5 : 2}
          />
          Today
        </button>

        <div className="flex h-16 items-start justify-center">
          <button
            type="button"
            onClick={onLog}
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-lg shadow-amber-200/80 ring-4 ring-[#FBF9F5] transition hover:bg-amber-600"
            aria-label="Log food, meds, supplements, weight, activity, a note, or send Fleamail"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onChange('pack')}
          className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
            activeTab === 'pack' ? 'text-[#F59E0B]' : 'text-slate-400'
          }`}
          aria-label={dogs.length > 1 ? `Pack — ${dogLabel}` : 'Pack'}
        >
          {hasPackPup ? (
            <DogAvatar
              name={dogLabel}
              photoUrl={packLead?.photoUrl}
              size="nav"
              ring={activeTab === 'pack'}
            />
          ) : (
            <Users
              size={22}
              strokeWidth={activeTab === 'pack' ? 2.5 : 2}
            />
          )}
          Pack
        </button>
      </div>
    </nav>
  )
}
