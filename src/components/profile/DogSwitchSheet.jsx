import { Check, Plus } from 'lucide-react'
import Modal from '../ui/Modal'
import DogAvatar from './DogAvatar'
import { useApp } from '../../context/AppContext'

/** Instagram-style account list for switching the active pup. */
export default function DogSwitchSheet({ open, onClose, onAddDog }) {
  const { dogs, activeDogId, dispatch } = useApp()

  function handleSelect(id) {
    if (id !== activeDogId) {
      dispatch({ type: 'SET_ACTIVE_DOG', payload: id })
    }
    onClose()
  }

  return (
    <Modal open={open} title="Switch pup" onClose={onClose}>
      {dogs.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add a pup profile first — Bowl, Trip, and portions follow the active
          dog.
        </p>
      ) : (
        <ul className="space-y-1">
          {dogs.map((dog) => {
            const active = dog.id === activeDogId
            return (
              <li key={dog.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(dog.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors ${
                    active ? 'bg-amber-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <DogAvatar
                    name={dog.name}
                    photoUrl={dog.photoUrl}
                    size="sm"
                    ring={active}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                    {dog.name || 'Unnamed'}
                  </span>
                  {active ? (
                    <Check
                      size={18}
                      className="shrink-0 text-[#F59E0B]"
                      strokeWidth={2.5}
                      aria-label="Active"
                    />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {onAddDog ? (
        <button
          type="button"
          onClick={() => {
            onClose()
            onAddDog()
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-amber-200 px-2 py-2.5 text-left text-sm font-semibold text-[#F59E0B] transition-colors hover:bg-amber-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Plus size={18} strokeWidth={2.5} />
          </span>
          Add another dog
        </button>
      ) : null}
    </Modal>
  )
}
