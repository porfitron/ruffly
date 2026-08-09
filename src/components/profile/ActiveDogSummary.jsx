import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import DogSummaryCard, {
  feedingPlanForDog,
  formatPortionSnippet,
} from './DogSummaryCard'
import DogSwitchSheet from './DogSwitchSheet'

/** Active pup banner for Pantry / Bowl / Trip — tap to switch. */
export default function ActiveDogSummary({ onAddDog }) {
  const { activeDog, pantry, mealPlansByDogId, dogs } = useApp()
  const [switchOpen, setSwitchOpen] = useState(false)

  if (!activeDog) return null

  const mealPlan = mealPlansByDogId?.[activeDog.id] ?? []
  const portionSnippet = formatPortionSnippet(
    feedingPlanForDog(activeDog, pantry, mealPlan),
  )

  return (
    <>
      <div className="print:hidden">
        <DogSummaryCard
          dog={activeDog}
          active
          portionSnippet={portionSnippet}
          onSelect={dogs.length > 1 ? () => setSwitchOpen(true) : undefined}
        />
      </div>
      <DogSwitchSheet
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onAddDog={onAddDog}
      />
    </>
  )
}
