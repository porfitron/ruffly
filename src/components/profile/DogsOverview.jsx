import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import DogSummaryCard, {
  feedingPlanForDog,
  formatPortionSnippet,
} from './DogSummaryCard'
import ProfileEditor from './ProfileEditor'
import PortionCalculator from './PortionCalculator'

function sortDogsByName(dogs) {
  return [...dogs].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

/** Compact pup tab: A–Z dogs; tap to activate, tap active to toggle portion summary. */
export default function DogsOverview({
  addingNew,
  onAddNew,
  onCancelAdd,
  onAdded,
  onGoToPantry,
  onGoToBowl,
}) {
  const { dogs, activeDogId, pantry, mealPlansByDogId, dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const orderedDogs = sortDogsByName(dogs)

  useEffect(() => {
    setEditing(false)
    setSummaryOpen(true)
  }, [activeDogId])

  function handleSelect(id) {
    if (id === activeDogId) {
      setEditing(false)
      setSummaryOpen((open) => !open)
      return
    }
    setEditing(false)
    setSummaryOpen(true)
    dispatch({ type: 'SET_ACTIVE_DOG', payload: id })
  }

  function handleEdit() {
    setEditing(true)
    setSummaryOpen(true)
  }

  function handleAdded() {
    setEditing(false)
    onAdded?.()
  }

  if (addingNew) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Add another pup</h2>
          <Button variant="ghost" className="!h-10 px-3" onClick={onCancelAdd}>
            Cancel
          </Button>
        </div>
        <ProfileEditor addingNew onAdded={handleAdded} />
      </div>
    )
  }

  if (dogs.length === 0) {
    return (
      <div className="space-y-3">
        <ProfileEditor onAdded={handleAdded} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {orderedDogs.map((dog) => {
          const mealPlan = mealPlansByDogId?.[dog.id] ?? []
          const snippet = formatPortionSnippet(
            feedingPlanForDog(dog, pantry, mealPlan),
          )
          const active = dog.id === activeDogId
          return (
            <li key={dog.id} className={active ? 'space-y-2' : undefined}>
              <DogSummaryCard
                dog={dog}
                active={active}
                expanded={active ? summaryOpen : undefined}
                portionSnippet={snippet}
                onSelect={() => handleSelect(dog.id)}
                onEdit={active ? handleEdit : undefined}
              />
              {active && summaryOpen ? (
                editing ? (
                  <ProfileEditor
                    onAdded={() => setEditing(false)}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <PortionCalculator
                    compact
                    onGoToPantry={onGoToPantry}
                    onGoToBowl={onGoToBowl}
                  />
                )
              ) : null}
            </li>
          )
        })}
      </ul>

      <Button variant="secondary" className="w-full !h-11" onClick={onAddNew}>
        + Add another dog
      </Button>
    </div>
  )
}
