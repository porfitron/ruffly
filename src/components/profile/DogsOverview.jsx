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

/** Compact pup tab: A–Z dog summaries; tap a row to make it active. */
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
  const orderedDogs = sortDogsByName(dogs)

  useEffect(() => {
    setEditing(false)
  }, [activeDogId])

  function handleSelect(id) {
    if (id === activeDogId) return
    setEditing(false)
    dispatch({ type: 'SET_ACTIVE_DOG', payload: id })
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
            <li key={dog.id}>
              <DogSummaryCard
                dog={dog}
                active={active}
                portionSnippet={snippet}
                onSelect={() => handleSelect(dog.id)}
                onEdit={active ? () => setEditing(true) : undefined}
              />
            </li>
          )
        })}
      </ul>

      {editing ? (
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
      )}

      <Button variant="secondary" className="w-full !h-11" onClick={onAddNew}>
        + Add another dog
      </Button>
    </div>
  )
}
