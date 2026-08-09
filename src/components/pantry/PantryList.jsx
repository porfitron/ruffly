import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import FoodItemForm from './FoodItemForm'
import { useApp } from '../../context/AppContext'
import { getCategoryLabel } from '../../utils/calculations'

function densitySummary(food) {
  const bits = []
  if (food.kcalPerKg) bits.push(`${food.kcalPerKg} kcal/kg`)
  if (food.kcalPerCup) bits.push(`${food.kcalPerCup} kcal/cup`)
  if (food.kcalPerCan) bits.push(`${food.kcalPerCan} kcal/can`)
  return bits.join(' · ')
}

/** P2 — Saved foods with edit / delete / add-to-bowl */
export default function PantryList({ editingFood = null, onEdit, onDone }) {
  const { pantry, currentMealPlan, activeDog, dispatch, createId } = useApp()

  function importPrimaryFood() {
    const primary = activeDog?.primaryFood
    if (!primary) return
    dispatch({
      type: 'UPSERT_FOOD',
      payload: {
        id: createId('food'),
        name: primary.name || 'Primary food',
        brand: '',
        flavor: '',
        category: 'kibble',
        kcalPerKg: primary.kcalPerKg,
        kcalPerCup: primary.kcalPerCup,
        kcalPerCan: null,
        productUrl: '',
      },
    })
  }

  if (pantry.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Food pantry</h2>
        <p className="mt-2 text-sm text-slate-500">
          Save kibbles, wet food, toppers, and treats with calorie density and
          reorder links.
        </p>
        {activeDog?.primaryFood ? (
          <Button className="mt-5 w-full" onClick={importPrimaryFood}>
            Import “{activeDog.primaryFood.name}” from pup profile
          </Button>
        ) : null}
      </Card>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Your pantry</h2>
          <p className="text-sm text-slate-500">
            {pantry.length} food{pantry.length === 1 ? '' : 's'} saved
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {pantry.map((food) => {
          const inBowl = currentMealPlan.some((item) => item.foodId === food.id)
          const isEditing = editingFood?.id === food.id

          return (
            <Card as="li" key={food.id} className="space-y-3">
              {isEditing ? (
                <FoodItemForm
                  embedded
                  editingFood={food}
                  onDone={onDone}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {[food.name, food.flavor].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-sm text-slate-500">
                        {[food.brand, getCategoryLabel(food.category)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {densitySummary(food)}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#F59E0B]">
                      {getCategoryLabel(food.category)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="h-11 flex-1 px-3 text-xs"
                      onClick={() => onEdit?.(food)}
                    >
                      <Pencil size={16} />
                      Edit
                    </Button>
                    <Button
                      variant={inBowl ? 'ghost' : 'sage'}
                      className="h-11 flex-1 px-3 text-xs"
                      onClick={() =>
                        dispatch({
                          type: inBowl ? 'REMOVE_FROM_MEAL' : 'ADD_TO_MEAL',
                          payload: food.id,
                        })
                      }
                    >
                      <Plus size={16} />
                      {inBowl ? 'Remove from bowl' : 'Add to bowl'}
                    </Button>
                    {food.productUrl ? (
                      <a
                        href={food.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        <ExternalLink size={16} />
                        Reorder
                      </a>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="h-11 px-3 text-xs text-rose-500"
                      aria-label={`Delete ${food.name}`}
                      onClick={() =>
                        dispatch({ type: 'REMOVE_FOOD', payload: food.id })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )
        })}
      </ul>
    </section>
  )
}
