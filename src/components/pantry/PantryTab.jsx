import { useState } from 'react'
import PantryList from './PantryList'
import FoodItemForm from './FoodItemForm'

export default function PantryTab() {
  const [editingFood, setEditingFood] = useState(null)

  return (
    <>
      <PantryList
        editingFood={editingFood}
        onEdit={setEditingFood}
        onDone={() => setEditingFood(null)}
      />
      <FoodItemForm />
    </>
  )
}
