import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Minus, MoreVertical, Plus } from 'lucide-react'
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
  if (food.proteinPercent != null) bits.push(`${food.proteinPercent}% protein`)
  if (food.fatPercent != null) bits.push(`${food.fatPercent}% fat`)
  return bits.join(' · ')
}

function foodMatchesQuery(food, query) {
  if (!query) return true
  const haystack = [food.brand, food.name, food.flavor, food.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function FoodItemMenu({ food, inBowl, open, onToggleOpen, onToggleBowl }) {
  const rootRef = useRef(null)
  const onToggleOpenRef = useRef(onToggleOpen)
  onToggleOpenRef.current = onToggleOpen

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        onToggleOpenRef.current(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') onToggleOpenRef.current(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:bg-amber-50 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        aria-label={`More actions for ${food.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onToggleOpen(!open)}
      >
        <MoreVertical size={18} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`${food.name} actions`}
          className="absolute right-0 top-full z-20 mt-1 min-w-[11.5rem] overflow-hidden rounded-2xl border border-amber-100 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-amber-50"
            onClick={() => {
              onToggleBowl()
              onToggleOpen(false)
            }}
          >
            {inBowl ? <Minus size={16} /> : <Plus size={16} />}
            {inBowl ? 'Remove from bowl' : 'Add to bowl'}
          </button>
          {food.productUrl ? (
            <a
              href={food.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-amber-50"
              onClick={() => onToggleOpen(false)}
            >
              <ExternalLink size={16} />
              Reorder
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** P2 — Saved foods with edit / delete / add-to-bowl */
export default function PantryList({
  query = '',
  editingFood = null,
  onEdit,
  onDone,
}) {
  const { pantry, currentMealPlan, activeDog, dispatch, createId } = useApp()
  const [openMenuId, setOpenMenuId] = useState(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredFoods = useMemo(
    () => pantry.filter((food) => foodMatchesQuery(food, normalizedQuery)),
    [pantry, normalizedQuery],
  )

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
        proteinPercent: primary.proteinPercent ?? null,
        fatPercent: primary.fatPercent ?? null,
        productUrl: '',
      },
    })
  }

  if (pantry.length === 0) {
    return activeDog?.primaryFood ? (
      <Card className="text-center">
        <p className="text-sm text-slate-500">
          Or import the primary food from this pup’s profile.
        </p>
        <Button className="mt-4 w-full" onClick={importPrimaryFood}>
          Import “{activeDog.primaryFood.name}”
        </Button>
      </Card>
    ) : null
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Saved foods</h2>
          <p className="text-sm text-slate-500">
            {normalizedQuery
              ? `${filteredFoods.length} of ${pantry.length} match${
                  filteredFoods.length === 1 ? '' : 'es'
                }`
              : `${pantry.length} food${pantry.length === 1 ? '' : 's'} saved`}
          </p>
        </div>
      </div>

      {filteredFoods.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-slate-500">
            No foods match “{query.trim()}”.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filteredFoods.map((food) => {
            const inBowl = currentMealPlan.some(
              (item) => item.foodId === food.id,
            )
            const isEditing = editingFood?.id === food.id
            const menuOpen = openMenuId === food.id

            return (
              <Card as="li" key={food.id} className="space-y-3">
                {isEditing ? (
                  <FoodItemForm
                    embedded
                    editingFood={food}
                    onDone={() => {
                      setOpenMenuId(null)
                      onDone?.()
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                      onClick={() => {
                        setOpenMenuId(null)
                        onEdit?.(food)
                      }}
                      aria-label={`Edit ${food.name}`}
                    >
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
                    </button>

                    <FoodItemMenu
                      food={food}
                      inBowl={inBowl}
                      open={menuOpen}
                      onToggleOpen={(next) =>
                        setOpenMenuId(next ? food.id : null)
                      }
                      onToggleBowl={() =>
                        dispatch({
                          type: inBowl ? 'REMOVE_FROM_MEAL' : 'ADD_TO_MEAL',
                          payload: food.id,
                        })
                      }
                    />
                  </div>
                )}
              </Card>
            )
          })}
        </ul>
      )}
    </section>
  )
}
