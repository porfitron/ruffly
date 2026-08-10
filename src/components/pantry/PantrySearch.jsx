import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { fieldClassName } from '../ui/Field'
import FoodItemForm from './FoodItemForm'
import { useApp } from '../../context/AppContext'

/** Search pantry foods (filters the list below) or create a new one */
export default function PantrySearch({
  query,
  onQueryChange,
  creating,
  onCreatingChange,
  onCreated,
}) {
  const { pantry } = useApp()
  const createName = query.trim()

  useEffect(() => {
    if (pantry.length === 0) onCreatingChange(true)
  }, [pantry.length, onCreatingChange])

  function resetCreate() {
    onCreatingChange(false)
    onQueryChange('')
  }

  if (creating) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800">Add food</h3>
            <p className="mt-1 text-sm text-slate-500">
              Save density + a reorder link so the bowl balancer can portion
              precisely.
            </p>
          </div>
          {pantry.length > 0 ? (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
              onClick={resetCreate}
              aria-label="Cancel add food"
            >
              −
            </button>
          ) : null}
        </div>
        <FoodItemForm
          embedded
          hideHeader
          initialName={createName}
          onDone={() => {
            resetCreate()
            onCreated?.()
          }}
        />
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-bold text-slate-800">My Pantry</h3>
      <p className="mt-1 text-sm text-slate-500">
        Search your pantry or create something new.
      </p>

      <div className="relative mt-3">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="pantry-food-search"
          className={`${fieldClassName} !mt-0 pl-11`}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search pantry foods…"
          autoComplete="off"
          aria-label="Search pantry foods"
        />
      </div>

      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => onCreatingChange(true)}
      >
        <Plus size={16} />
        {createName ? `Create “${createName}”` : 'Add food'}
      </Button>
    </Card>
  )
}
