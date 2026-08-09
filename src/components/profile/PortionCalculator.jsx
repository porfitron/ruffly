import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import {
  buildMealBreakdown,
  resolveActiveFeedingPlan,
  resolveMealSessions,
} from '../../utils/calculations'

/** Read-only daily portion summary — food entry lives in Pantry / Bowl */
export default function PortionCalculator({ onGoToPantry, onGoToBowl }) {
  const { activeDog, pantry, currentMealPlan } = useApp()

  if (!activeDog) return null

  const der = activeDog.targetDER ?? 0
  const mealsPerDay = Number(activeDog.mealsPerDay) === 1 ? 1 : 2
  let feedingPlan = resolveActiveFeedingPlan(
    activeDog,
    pantry,
    currentMealPlan,
  )

  // Single pantry food → show full daily portion without requiring bowl setup
  if (feedingPlan.length === 0 && pantry.length === 1) {
    feedingPlan = buildMealBreakdown(
      [{ foodId: pantry[0].id, percentage: 100 }],
      pantry,
      der,
      mealsPerDay,
    )
  }

  if (pantry.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Next: Pantry</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add {activeDog.name}&apos;s foods in the Pantry — calorie density
          there turns the{' '}
          <span className="font-semibold text-[#10B981]">{der} kcal</span>{' '}
          daily target into grams and cups.
        </p>
        <Button className="mt-5 w-full" onClick={onGoToPantry}>
          Go to Pantry
        </Button>
      </Card>
    )
  }

  if (feedingPlan.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Daily portion</h2>
        <p className="mt-2 text-sm text-slate-500">
          Foods are in the Pantry. Add them to the bowl and set percentages to
          see {activeDog.name}&apos;s daily portions here.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button className="w-full" onClick={onGoToBowl}>
            Balance the bowl
          </Button>
          <Button variant="secondary" className="w-full" onClick={onGoToPantry}>
            Back to Pantry
          </Button>
        </div>
      </Card>
    )
  }

  const single = feedingPlan.length === 1 ? feedingPlan[0] : null
  const singleServings = single?.servings
  const hasGrams = Boolean(singleServings?.grams)
  const hasCups = Boolean(singleServings?.cups)

  return (
    <Card>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Daily portion
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-800">
          {single ? single.food.name : `${activeDog.name}'s bowl`}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Based on the Pantry and bowl mix for{' '}
          <span className="font-semibold text-[#10B981]">{der} kcal</span>
          /day.
        </p>
      </div>

      {single ? (
        <div className="mt-5 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Suggested daily feeding
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            {hasGrams ? (
              <p>
                <span className="text-3xl font-extrabold text-slate-800">
                  {singleServings.grams}
                </span>
                <span className="ml-1 text-sm font-semibold text-slate-500">
                  g / day
                </span>
              </p>
            ) : null}
            {hasCups ? (
              <p>
                <span className="text-3xl font-extrabold text-slate-800">
                  {singleServings.cups}
                </span>
                <span className="ml-1 text-sm font-semibold text-slate-500">
                  cups / day
                </span>
              </p>
            ) : null}
            {!hasGrams && !hasCups && singleServings?.kcal ? (
              <p>
                <span className="text-3xl font-extrabold text-slate-800">
                  {singleServings.kcal}
                </span>
                <span className="ml-1 text-sm font-semibold text-slate-500">
                  kcal / day
                </span>
              </p>
            ) : null}
          </div>

          {(hasGrams || hasCups) && (
            <div
              className={`mt-4 grid gap-3 ${mealsPerDay === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
            >
              {resolveMealSessions(mealsPerDay).map((meal) => (
                <MealChip
                  key={meal.id}
                  label={meal.label.replace(' Bowl', '')}
                  grams={
                    hasGrams ? singleServings[meal.gramsKey] || null : null
                  }
                  cups={hasCups ? singleServings[meal.cupsKey] || null : null}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {feedingPlan.map((item) => {
            const { food, servings, percentage } = item
            const parts = []
            if (servings.grams) parts.push(`${servings.grams} g`)
            if (servings.cups) parts.push(`${servings.cups} cups`)
            if (servings.cans) parts.push(`${servings.cans} cans`)
            if (parts.length === 0 && servings.kcal) {
              parts.push(`${servings.kcal} kcal`)
            }
            return (
              <li
                key={food.id}
                className="rounded-3xl border border-amber-100 bg-[#FBF9F5] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {food.name}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#10B981]">
                      {parts.join(' · ') || '—'}
                      <span className="font-medium text-slate-400"> / day</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          className="w-full sm:flex-1"
          onClick={onGoToBowl}
        >
          Adjust bowl
        </Button>
        <Button
          variant="ghost"
          className="w-full sm:flex-1"
          onClick={onGoToPantry}
        >
          Edit Pantry
        </Button>
      </div>
    </Card>
  )
}

function MealChip({ label, grams, cups }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">
        {grams != null ? `${grams} g` : null}
        {grams != null && cups != null ? ' · ' : null}
        {cups != null ? `${cups} cups` : null}
      </p>
    </div>
  )
}
