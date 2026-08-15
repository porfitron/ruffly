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

function PresencePill({ away }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        away
          ? 'bg-slate-100 text-slate-500'
          : 'bg-emerald-50 text-[#10B981]'
      }`}
    >
      {away ? 'away' : 'home'}
    </span>
  )
}

/**
 * Compact pup row: avatar + vitals.
 * Pack uses selected/expanded (no “Active” badge).
 */
export default function DogSummaryCard({
  dog,
  active = false,
  selected = false,
  expanded,
  portionSnippet = null,
  onSelect,
  onEdit,
  showActiveBadge = true,
  showPresence = false,
  onTogglePresence,
  reorderHandle = null,
  dragging = false,
}) {
  const name = dog.name?.trim() || 'Unnamed'
  const away = Boolean(dog.away)
  const weight =
    dog.weight != null && dog.weight !== ''
      ? `${dog.weight} ${dog.weightUnit || 'lbs'}`
      : null
  const der = dog.targetDER ? `${dog.targetDER} kcal` : null
  const meta = [weight, der].filter(Boolean).join(' · ')
  const highlighted = selected || active

  const body = (
    <>
      <DogAvatar
        name={name}
        photoUrl={dog.photoUrl}
        size="sm"
        ring={highlighted}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-bold text-slate-800">{name}</p>
          {showPresence && !onTogglePresence ? (
            <PresencePill away={away} />
          ) : null}
          {showActiveBadge && active ? (
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
      className={`rounded-3xl bg-white p-3 shadow-sm ${
        dragging
          ? 'relative z-10 scale-[1.02] shadow-lg ring-2 ring-[#F59E0B]/40'
          : highlighted
            ? 'ring-2 ring-[#F59E0B]/40 transition-shadow'
            : 'transition-shadow hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        {onSelect ? (
          <button
            type="button"
            className={`flex min-w-0 flex-1 items-center gap-3 text-left ${
              showPresence && away ? 'opacity-70' : ''
            }`}
            onClick={onSelect}
            aria-label={
              typeof expanded === 'boolean'
                ? expanded
                  ? `Hide details for ${name}`
                  : `Show details for ${name}`
                : `Select ${name}`
            }
            aria-expanded={
              typeof expanded === 'boolean' ? expanded : undefined
            }
          >
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
        )}

        {showPresence && onTogglePresence ? (
          <button
            type="button"
            onClick={onTogglePresence}
            className="flex h-11 shrink-0 items-center rounded-full px-1 hover:bg-slate-50"
            aria-label={
              away ? `Mark ${name} as home` : `Pause ${name}’s routine`
            }
            aria-pressed={away}
          >
            <PresencePill away={away} />
          </button>
        ) : null}

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-[#F59E0B] hover:bg-amber-100"
          >
            Edit
          </button>
        ) : null}

        {reorderHandle}
      </div>
    </div>
  )
}
