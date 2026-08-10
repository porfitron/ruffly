import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { fieldClassName } from '../ui/Field'
import FoodItemForm from '../pantry/FoodItemForm'
import { useApp } from '../../context/AppContext'
import { getCategoryLabel } from '../../utils/calculations'

function foodMatchesQuery(food, query) {
  if (!query) return true
  const haystack = [food.brand, food.name, food.flavor, food.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

/** Search pantry foods to add to the bowl, or create a new one inline */
export default function BowlFoodSearch() {
  const { pantry, currentMealPlan, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const normalizedQuery = query.trim().toLowerCase()
  const createName = query.trim()

  const foodsNotInBowl = useMemo(
    () =>
      pantry.filter(
        (food) => !currentMealPlan.some((item) => item.foodId === food.id),
      ),
    [pantry, currentMealPlan],
  )

  const matches = useMemo(() => {
    if (!normalizedQuery) return []
    return foodsNotInBowl.filter((food) =>
      foodMatchesQuery(food, normalizedQuery),
    )
  }, [foodsNotInBowl, normalizedQuery])

  function resetSearch() {
    setQuery('')
    setCreating(false)
  }

  function startCreate() {
    setCreating(true)
  }

  if (creating) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800">Create new food</h3>
            <p className="mt-1 text-sm text-slate-500">
              Saves to My Pantry and adds it to this bowl.
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={resetSearch}
            aria-label="Cancel create food"
          >
            −
          </button>
        </div>
        <FoodItemForm
          embedded
          addToBowl
          hideHeader
          initialName={createName}
          onDone={resetSearch}
        />
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-bold text-slate-800">Add food</h3>
      <p className="mt-1 text-sm text-slate-500">
        Search My Pantry or create something new.
      </p>

      <div className="relative mt-3">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="bowl-food-search"
          className={`${fieldClassName} !mt-0 pl-11`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pantry foods…"
          autoComplete="off"
          aria-label="Search pantry foods"
        />
      </div>

      {normalizedQuery && matches.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {matches.map((food) => (
            <li
              key={food.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF9F5] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {food.name}
                </p>
                <p className="text-xs text-slate-500">
                  {[food.brand, getCategoryLabel(food.category)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Button
                variant="sage"
                className="h-11 shrink-0 px-4 text-xs"
                onClick={() =>
                  dispatch({ type: 'ADD_TO_MEAL', payload: food.id })
                }
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : normalizedQuery && foodsNotInBowl.length > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No pantry matches for “{createName}”.
        </p>
      ) : normalizedQuery && pantry.length > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Every pantry food is already in the bowl.
        </p>
      ) : pantry.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Your pantry is empty — create the first food below.
        </p>
      ) : null}

      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={startCreate}
      >
        <Plus size={16} />
        {createName
          ? `Create “${createName}”`
          : 'Create new food'}
      </Button>
    </Card>
  )
}
