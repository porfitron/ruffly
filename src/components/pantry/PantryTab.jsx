import { useCallback, useState } from 'react'
import PantrySearch from './PantrySearch'
import PantryList from './PantryList'

export default function PantryTab() {
  const [editingFood, setEditingFood] = useState(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreatingChange = useCallback((next) => {
    setCreating(next)
    if (next) setEditingFood(null)
  }, [])

  return (
    <div className="space-y-4">
      <PantrySearch
        query={query}
        onQueryChange={setQuery}
        creating={creating}
        onCreatingChange={handleCreatingChange}
      />
      <PantryList
        query={query}
        editingFood={editingFood}
        onEdit={(food) => {
          setCreating(false)
          setEditingFood(food)
        }}
        onDone={() => setEditingFood(null)}
      />
    </div>
  )
}
