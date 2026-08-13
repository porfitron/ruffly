import { useApp } from '../../context/AppContext'
import DogAvatar from '../profile/DogAvatar'
import CareInfoForm from './CareInfoForm'
import DogsitterSheet from './DogsitterSheet'

function sortDogsByName(dogs) {
  return [...dogs].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

function CareGuideDogSwitcher() {
  const { dogs, activeDog, dispatch } = useApp()
  if (dogs.length < 2) return null

  const ordered = sortDogsByName(dogs)

  return (
    <div className="print:hidden">
      <p className="text-sm font-medium text-slate-700">Whose care guide?</p>
      <div
        className="-mx-1 mt-2 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Choose a dog"
      >
        {ordered.map((dog) => {
          const active = dog.id === activeDog?.id
          const name = dog.name?.trim() || 'Unnamed'
          return (
            <button
              key={dog.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                dispatch({ type: 'SET_ACTIVE_DOG', payload: dog.id })
              }
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-amber-50 text-[#F59E0B] ring-2 ring-[#F59E0B]/50'
                  : 'bg-white text-slate-600 shadow-sm hover:bg-amber-50'
              }`}
            >
              <DogAvatar
                name={name}
                photoUrl={dog.photoUrl}
                size="xs"
                ring={active}
              />
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Printable care handoff — contacts + care guide sheet. */
export default function CareGuideTab() {
  return (
    <>
      <CareGuideDogSwitcher />
      <CareInfoForm />
      <DogsitterSheet />
    </>
  )
}
