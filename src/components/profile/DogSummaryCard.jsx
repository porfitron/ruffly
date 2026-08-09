import DogAvatar from './DogAvatar'
import {
  buildMealBreakdown,
  resolveActiveFeedingPlan,
} from '../../utils/calculations'

/** Feeding plan for any dog (bowl mix, or sole pantry food). */
export function feedingPlanForDog(dog, pantry, mealPlan) {
  if (!dog) return []
  const der = dog.targetDER ?? 0
  const mealsPerDay = Number(dog.mealsPerDay) === 1 ? 1 : 2
  let plan = resolveActiveFeedingPlan(dog, pantry, mealPlan)
  if (plan.length === 0 && pantry.length === 1) {
    plan = buildMealBreakdown(
      [{ foodId: pantry[0].id, percentage: 100 }],
      pantry,
      der,
      mealsPerDay,
    )
  }
  return plan
}

/** One-line feeding snippet for a dog summary card. */
export function formatPortionSnippet(feedingPlan) {
  if (!feedingPlan?.length) return null

  if (feedingPlan.length === 1) {
    const { servings } = feedingPlan[0]
    const parts = []
    if (servings?.grams) parts.push(`${servings.grams} g`)
    if (servings?.cups) parts.push(`${servings.cups} cups`)
    if (parts.length === 0 && servings?.kcal) parts.push(`${servings.kcal} kcal`)
    return parts.length ? `${parts.join(' · ')} / day` : null
  }

  return `${feedingPlan.length} foods in bowl`
}

/**
 * Compact pup row: avatar, vitals, optional portion line.
 * Tap the row to make that dog active (or open switcher); Edit stays separate.
 */
export default function DogSummaryCard({
  dog,
  active = false,
  portionSnippet = null,
  onSelect,
  onEdit,
}) {
  const name = dog.name?.trim() || 'Unnamed'
  const weight =
    dog.weight != null && dog.weight !== ''
      ? `${dog.weight} ${dog.weightUnit || 'lbs'}`
      : null
  const der = dog.targetDER ? `${dog.targetDER} kcal` : null
  const meta = [weight, der].filter(Boolean).join(' · ')

  const body = (
    <>
      <DogAvatar
        name={name}
        photoUrl={dog.photoUrl}
        size="sm"
        ring={active}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-bold text-slate-800">{name}</p>
          {active ? (
            <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F59E0B]">
              Active
            </span>
          ) : null}
        </div>
        {meta ? (
          <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>
        ) : (
          <p className="mt-0.5 text-sm text-slate-400">Tap to set up</p>
        )}
        {portionSnippet ? (
          <p className="mt-0.5 truncate text-sm font-semibold text-[#10B981]">
            {portionSnippet}
          </p>
        ) : null}
      </div>
    </>
  )

  return (
    <div
      className={`rounded-3xl bg-white p-3 shadow-sm transition-shadow ${
        active ? 'ring-2 ring-[#F59E0B]/40' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        {onSelect ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={onSelect}
            aria-label={active ? `${name} (active)` : `Switch to ${name}`}
            aria-current={active ? 'true' : undefined}
          >
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
        )}

        {active && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-[#F59E0B] hover:bg-amber-100"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  )
}
