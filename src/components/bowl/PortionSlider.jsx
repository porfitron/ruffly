import { X } from 'lucide-react'
import { getCategoryLabel } from '../../utils/calculations'

/** Percentage slider for one pantry item in the bowl */
export default function PortionSlider({
  food,
  percentage,
  allocatedKcal,
  servings,
  onChange,
  onRemove,
}) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-[#FBF9F5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{food.name}</p>
          <p className="text-xs text-slate-500">
            {getCategoryLabel(food.category)} · {Math.round(allocatedKcal)} kcal
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label={`Remove ${food.name} from bowl`}
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={percentage}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-100 accent-[#F59E0B]"
          aria-label={`${food.name} calorie percentage`}
        />
        <div className="flex h-11 w-16 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#F59E0B] shadow-sm">
          {percentage}%
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <ServingChip
          label="Full day"
          parts={dailyParts(servings)}
        />
        <div className="grid grid-cols-2 gap-2">
          <ServingChip
            label="Breakfast"
            parts={halfParts(servings, 'breakfast')}
          />
          <ServingChip
            label="Dinner"
            parts={halfParts(servings, 'dinner')}
          />
        </div>
      </div>
    </div>
  )
}

function dailyParts(servings) {
  const parts = []
  if (servings.grams) parts.push(`${servings.grams} g`)
  if (servings.cups) parts.push(`${servings.cups} cups`)
  if (servings.cans) parts.push(`${servings.cans} cans`)
  return parts.length ? parts : ['Add kcal density on this food']
}

function halfParts(servings, which) {
  const parts = []
  if (which === 'breakfast') {
    if (servings.breakfastGrams) parts.push(`${servings.breakfastGrams} g`)
    if (servings.breakfastCups) parts.push(`${servings.breakfastCups} cups`)
    if (servings.breakfastCans) parts.push(`${servings.breakfastCans} cans`)
  } else {
    if (servings.dinnerGrams) parts.push(`${servings.dinnerGrams} g`)
    if (servings.dinnerCups) parts.push(`${servings.dinnerCups} cups`)
    if (servings.dinnerCans) parts.push(`${servings.dinnerCans} cans`)
  }
  return parts.length ? parts : ['—']
}

function ServingChip({ label, parts }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-slate-700">{parts.join(' · ')}</p>
    </div>
  )
}
