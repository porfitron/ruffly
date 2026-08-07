import { useState } from 'react'
import PantryList from './PantryList'
import FoodItemForm from './FoodItemForm'

export default function PantryTab() {
  const [editingFood, setEditingFood] = useState(null)

  return (
    <>
      <PantryList
        onEdit={(food) => {
          setEditingFood(food)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
      <FoodItemForm
        editingFood={editingFood}
        onDone={() => setEditingFood(null)}
      />
    </>
  )
}
