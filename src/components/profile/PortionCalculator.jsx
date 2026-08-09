import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import {
  buildMealBreakdown,
  resolveActiveFeedingPlan,
  resolveMealSessions,
} from '../../utils/calculations'

/** Read-only daily portion summary — food entry lives in Pantry / Bowl */
export default function PortionCalculator({
  onGoToPantry,
  onGoToBowl,
  compact = false,
}) {
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

  const pad = compact ? '!p-4' : ''

  if (pantry.length === 0) {
    return (
      <Card className={`text-center ${pad}`}>
        <h2 className="text-base font-bold text-slate-800">Next: Pantry</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add foods so {activeDog.name}&apos;s{' '}
          <span className="font-semibold text-[#10B981]">{der} kcal</span>{' '}
          target becomes grams and cups.
        </p>
        <Button className="mt-3 w-full !h-11" onClick={onGoToPantry}>
          Go to Pantry
        </Button>
      </Card>
    )
  }

  if (feedingPlan.length === 0) {
    return (
      <Card className={`text-center ${pad}`}>
        <h2 className="text-base font-bold text-slate-800">Daily portion</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add foods to the bowl to see {activeDog.name}&apos;s portions.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button className="w-full !h-11" onClick={onGoToBowl}>
            Balance the bowl
          </Button>
          <Button
            variant="secondary"
            className="w-full !h-11"
            onClick={onGoToPantry}
          >
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
    <Card className={pad}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Daily portion
          </p>
          <h2 className="truncate text-base font-bold text-slate-800">
            {single ? single.food.name : `${activeDog.name}'s bowl`}
          </h2>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#10B981]">
          {der} kcal
        </p>
      </div>

      {single ? (
        <div className="mt-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-3 py-3">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
            {hasGrams ? (
              <p>
                <span className="text-2xl font-extrabold text-slate-800">
                  {singleServings.grams}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  g / day
                </span>
              </p>
            ) : null}
            {hasCups ? (
              <p>
                <span className="text-2xl font-extrabold text-slate-800">
                  {singleServings.cups}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  cups / day
                </span>
              </p>
            ) : null}
            {!hasGrams && !hasCups && singleServings?.kcal ? (
              <p>
                <span className="text-2xl font-extrabold text-slate-800">
                  {singleServings.kcal}
                </span>
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  kcal / day
                </span>
              </p>
            ) : null}
          </div>

          {(hasGrams || hasCups) && (
            <div
              className={`mt-3 grid gap-2 ${mealsPerDay === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
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
        <ul className="mt-3 space-y-2">
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
                className="rounded-2xl border border-amber-100 bg-[#FBF9F5] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {food.name}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#10B981]">
                      {parts.join(' · ') || '—'}
                      <span className="font-medium text-slate-400"> / day</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          className="min-w-0 flex-1 !h-11"
          onClick={onGoToBowl}
        >
          Adjust bowl
        </Button>
        <Button
          variant="ghost"
          className="min-w-0 flex-1 !h-11"
          onClick={onGoToPantry}
        >
          Pantry
        </Button>
      </div>
    </Card>
  )
}

function MealChip({ label, grams, cups }) {
  return (
    <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-800">
        {grams != null ? `${grams} g` : null}
        {grams != null && cups != null ? ' · ' : null}
        {cups != null ? `${cups} cups` : null}
      </p>
    </div>
  )
}
