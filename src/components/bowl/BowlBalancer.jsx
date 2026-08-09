import Card from '../ui/Card'
import Button from '../ui/Button'
import CalorieRing from './CalorieRing'
import PortionSlider from './PortionSlider'
import { Field, SegmentedControl } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import {
  buildMealBreakdown,
  getCategoryLabel,
  resolveMealSessions,
} from '../../utils/calculations'

const MEALS_PER_DAY_OPTIONS = [
  { value: '1', label: '1 meal' },
  { value: '2', label: '2 meals' },
]

function formatServingParts(servings, meal) {
  const parts = []
  const grams = servings?.[meal.gramsKey]
  const cups = servings?.[meal.cupsKey]
  const cans = servings?.[meal.cansKey]
  if (grams) parts.push(`${grams} g`)
  if (cups) parts.push(`${cups} cups`)
  if (cans) parts.push(`${cans} cans`)
  return parts.length ? parts.join(' · ') : null
}

function formatDailyParts(servings) {
  const parts = []
  if (servings?.grams) parts.push(`${servings.grams} g`)
  if (servings?.cups) parts.push(`${servings.cups} cups`)
  if (servings?.cans) parts.push(`${servings.cans} cans`)
  return parts.length ? parts.join(' · ') : null
}

/** P2 — Mix pantry foods against daily DER, organized by meal time */
export default function BowlBalancer() {
  const { activeDog, pantry, currentMealPlan, dispatch } = useApp()
  const target = activeDog?.targetDER ?? 0
  const mealsPerDay = Number(activeDog?.mealsPerDay) === 1 ? 1 : 2
  const breakdown = buildMealBreakdown(
    currentMealPlan,
    pantry,
    target,
    mealsPerDay,
  )
  const mealSessions = resolveMealSessions(mealsPerDay)
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
  const mealFoods = breakdown.filter((item) => item.food.category !== 'treat')
  const treatFoods = breakdown.filter((item) => item.food.category === 'treat')
  const mealAllocatedKcal = mealFoods.reduce(
    (sum, item) => sum + (item.allocatedKcal || 0),
    0,
  )
  const treatAllocatedKcal = treatFoods.reduce(
    (sum, item) => sum + (item.allocatedKcal || 0),
    0,
  )
  const treatPercent = treatFoods.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0,
  )
  const mealPercent = mealFoods.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0,
  )
  const treatTotalGrams = treatFoods.reduce(
    (sum, item) => sum + (Number(item.servings.grams) || 0),
    0,
  )

  function setMealsPerDay(value) {
    if (!activeDog) return
    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        ...activeDog,
        mealsPerDay: Number(value) === 1 ? 1 : 2,
      },
    })
  }

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

  const bowlWord = mealsPerDay === 1 ? 'bowl' : 'bowls'
  const statusCopy =
    allocatedPercent === 0
      ? `Dial in percentages to fill the ${bowlWord}.`
      : allocatedPercent > 100
        ? `Over by ${Math.round(allocatedPercent - 100)}% — ease off a slider.`
        : allocatedPercent >= 98
          ? `Nice — the ${bowlWord} ${mealsPerDay === 1 ? 'is' : 'are'} balanced to the daily target.`
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
          <div
            className={`flex w-full items-center justify-center gap-4 ${
              mealsPerDay === 2 ? 'flex-row' : 'flex-col'
            }`}
          >
            {mealSessions.map((meal) => (
              <CalorieRing
                key={meal.id}
                allocatedPercent={allocatedPercent}
                mealPercent={mealPercent}
                treatPercent={treatPercent}
                allocatedKcal={allocatedKcal * meal.share}
                targetKcal={target * meal.share}
                size={mealsPerDay === 2 ? 140 : 168}
                label={
                  mealsPerDay === 2
                    ? meal.label.replace(' Bowl', '')
                    : null
                }
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-1.5 text-xs font-medium text-slate-500">
            <p className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-[#10B981]"
                aria-hidden
              />
              Meals {Math.round(mealPercent)}% of day
            </p>
            <p className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-[#F97316]"
                aria-hidden
              />
              Treats {Math.round(treatPercent)}% of day
            </p>
          </div>

          <p className="text-center text-sm text-slate-500">{statusCopy}</p>
        </div>

        <Field label="Meals per day" className="mt-5">
          <SegmentedControl
            ariaLabel="Meals per day"
            value={String(mealsPerDay)}
            onChange={setMealsPerDay}
            options={MEALS_PER_DAY_OPTIONS}
          />
        </Field>

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
        <>
          {mealFoods.length > 0
            ? mealSessions.map((meal) => {
                const mealKcal = Math.round(mealAllocatedKcal * meal.share)
                const totalGrams = mealFoods.reduce(
                  (sum, item) =>
                    sum + (Number(item.servings[meal.gramsKey]) || 0),
                  0,
                )
                return (
                  <Card key={meal.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {meal.label}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          ~{mealKcal} kcal
                          {totalGrams > 0 ? ` · ${totalGrams} g total` : ''}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {mealFoods.map((item) => {
                        const parts = formatServingParts(item.servings, meal)
                        const mealItemKcal = Math.round(
                          item.allocatedKcal * meal.share,
                        )
                        return (
                          <li
                            key={`${meal.id}-${item.foodId}`}
                            className="rounded-2xl bg-[#FBF9F5] px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">
                                  {item.food.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {getCategoryLabel(item.food.category)}
                                  {item.percentage > 0
                                    ? ` · ${Math.round(item.percentage)}% of day`
                                    : ''}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-bold text-[#10B981]">
                                {mealItemKcal > 0
                                  ? `${mealItemKcal} kcal`
                                  : '—'}
                              </p>
                            </div>
                            <p className="mt-2 text-sm font-bold text-slate-800">
                              {parts ?? 'Add calorie density on this food'}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </Card>
                )
              })
            : null}

          {treatFoods.length > 0 ? (
            <Card className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Daily Treats
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  ~{Math.round(treatAllocatedKcal)} kcal
                  {treatTotalGrams > 0
                    ? ` · ${treatTotalGrams} g total`
                    : ''}{' '}
                  · outside meal times
                </p>
              </div>

              <ul className="space-y-2">
                {treatFoods.map((item) => {
                  const parts = formatDailyParts(item.servings)
                  const treatKcal = Math.round(item.allocatedKcal)
                  return (
                    <li
                      key={`treat-${item.foodId}`}
                      className="rounded-2xl bg-[#FBF9F5] px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {item.food.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getCategoryLabel(item.food.category)}
                            {item.percentage > 0
                              ? ` · ${Math.round(item.percentage)}% of day`
                              : ''}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-[#10B981]">
                          {treatKcal > 0 ? `${treatKcal} kcal` : '—'}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {parts ?? 'Add calorie density on this food'}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : null}

          <Card className="space-y-3">
            <div>
              <h3 className="font-bold text-slate-800">Adjust food mix</h3>
              <p className="mt-1 text-sm text-slate-500">
                Set each food&apos;s share of the daily calorie target. Meal
                bowls above update automatically.
              </p>
            </div>
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
          </Card>
        </>
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
