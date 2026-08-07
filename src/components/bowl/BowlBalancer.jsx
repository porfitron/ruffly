import Card from '../ui/Card'
import Button from '../ui/Button'
import CalorieRing from './CalorieRing'
import PortionSlider from './PortionSlider'
import { useApp } from '../../context/AppContext'
import {
  buildMealBreakdown,
  getCategoryLabel,
} from '../../utils/calculations'

/** P2 — Mix pantry foods against daily DER */
export default function BowlBalancer() {
  const { activeDog, pantry, currentMealPlan, dispatch } = useApp()
  const target = activeDog?.targetDER ?? 0
  const breakdown = buildMealBreakdown(currentMealPlan, pantry, target)
  const allocatedPercent = breakdown.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0,
  )
  const allocatedKcal = breakdown.reduce(
    (sum, item) => sum + (item.allocatedKcal || 0),
    0,
  )

  const foodsNotInBowl = pantry.filter(
    (food) => !currentMealPlan.some((item) => item.foodId === food.id),
  )

  function setEqualSplit() {
    if (breakdown.length === 0) return
    const base = Math.floor(100 / breakdown.length)
    const remainder = 100 - base * breakdown.length
    const next = breakdown.map((item, index) => ({
      foodId: item.foodId,
      percentage: base + (index === 0 ? remainder : 0),
    }))
    dispatch({ type: 'SET_MEAL_PLAN', payload: next })
  }

  function normalizeTo100() {
    if (allocatedPercent <= 0 || breakdown.length === 0) return
    const next = breakdown.map((item) => ({
      foodId: item.foodId,
      percentage: Math.round((item.percentage / allocatedPercent) * 100),
    }))
    const total = next.reduce((sum, item) => sum + item.percentage, 0)
    if (total !== 100 && next[0]) {
      next[0] = {
        ...next[0],
        percentage: next[0].percentage + (100 - total),
      }
    }
    dispatch({ type: 'SET_MEAL_PLAN', payload: next })
  }

  if (!activeDog) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Bowl balancer</h2>
        <p className="mt-2 text-sm text-slate-500">
          Save a pup profile first so we know the daily calorie target.
        </p>
      </Card>
    )
  }

  if (pantry.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Bowl balancer</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add foods in the Pantry tab, then come back to mix the bowl.
        </p>
      </Card>
    )
  }

  const statusCopy =
    allocatedPercent === 0
      ? 'Dial in percentages to fill the bowl.'
      : allocatedPercent > 100
        ? `Over by ${Math.round(allocatedPercent - 100)}% — ease off a slider.`
        : allocatedPercent >= 98
          ? 'Nice — the bowl is balanced to the daily target.'
          : `${Math.round(100 - allocatedPercent)}% of calories still unassigned.`

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-slate-800">Bowl balancer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Split {target} kcal/day across foods in the bowl for{' '}
          <span className="font-semibold text-slate-700">{activeDog.name}</span>.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <CalorieRing
            allocatedPercent={allocatedPercent}
            allocatedKcal={allocatedKcal}
            targetKcal={target}
          />
          <p className="text-center text-sm text-slate-500">{statusCopy}</p>
        </div>

        {breakdown.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={setEqualSplit}>
              Split evenly
            </Button>
            <Button
              variant="secondary"
              onClick={normalizeTo100}
              disabled={allocatedPercent <= 0}
            >
              Scale to 100%
            </Button>
          </div>
        ) : null}
      </Card>

      {breakdown.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-slate-500">
            Nothing in the bowl yet. Add pantry items below.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {breakdown.map((item) => (
            <PortionSlider
              key={item.foodId}
              food={item.food}
              percentage={item.percentage}
              allocatedKcal={item.allocatedKcal}
              servings={item.servings}
              onChange={(percentage) =>
                dispatch({
                  type: 'SET_MEAL_PERCENTAGE',
                  payload: { foodId: item.foodId, percentage },
                })
              }
              onRemove={() =>
                dispatch({ type: 'REMOVE_FROM_MEAL', payload: item.foodId })
              }
            />
          ))}
        </div>
      )}

      {foodsNotInBowl.length > 0 ? (
        <Card>
          <h3 className="font-bold text-slate-800">Add from pantry</h3>
          <ul className="mt-3 space-y-2">
            {foodsNotInBowl.map((food) => (
              <li
                key={food.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF9F5] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {food.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getCategoryLabel(food.category)}
                  </p>
                </div>
                <Button
                  variant="sage"
                  className="h-11 px-4 text-xs"
                  onClick={() =>
                    dispatch({ type: 'ADD_TO_MEAL', payload: food.id })
                  }
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
