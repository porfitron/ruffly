import Card from '../ui/Card'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import {
  BUFFER_OPTIONS,
  buildTripPackList,
  resolveActiveFeedingPlan,
  resolvePackDays,
} from '../../utils/calculations'

function formatPackAmounts(item) {
  const parts = []
  if (item.packGrams) parts.push(`${item.packGrams} g`)
  if (item.packCups) parts.push(`${item.packCups} cups`)
  if (item.packCans) parts.push(`${item.packCans} cans`)
  return parts.length ? parts.join(' · ') : 'Add calorie density to this food'
}

/** P3 — Trip packing calculator */
export default function TripCalculator() {
  const { activeDog, pantry, currentMealPlan, tripSettings, dispatch } =
    useApp()

  if (!activeDog) {
    return (
      <Card className="text-center print:hidden">
        <h2 className="text-xl font-bold text-slate-800">Pack my bag</h2>
        <p className="mt-2 text-sm text-slate-500">
          Save a pup profile first, then we can calculate food to pack.
        </p>
      </Card>
    )
  }

  const days = tripSettings?.days ?? 3
  const bufferMode = tripSettings?.bufferMode ?? 'plus1'
  const packDays = resolvePackDays(days, bufferMode)
  const feedingPlan = resolveActiveFeedingPlan(
    activeDog,
    pantry,
    currentMealPlan,
  )
  const packList = buildTripPackList(feedingPlan, packDays)
  const totalGrams = packList.reduce((sum, item) => sum + (item.packGrams || 0), 0)
  const totalKcal = packList.reduce((sum, item) => sum + (item.packKcal || 0), 0)

  function updateSettings(partial) {
    dispatch({ type: 'SET_TRIP_SETTINGS', payload: partial })
  }

  return (
    <Card className="print:hidden">
      <h2 className="text-xl font-bold text-slate-800">Pack my bag</h2>
      <p className="mt-1 text-sm text-slate-500">
        Based on {activeDog.name}&apos;s bowl plan ({activeDog.targetDER}{' '}
        kcal/day).
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Trip length (days)" htmlFor="trip-days">
          <input
            id="trip-days"
            className={fieldClassName}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={days}
            onChange={(e) =>
              updateSettings({ days: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </Field>

        <Field label="Safety buffer">
          <SegmentedControl
            ariaLabel="Safety buffer"
            value={bufferMode}
            onChange={(value) => updateSettings({ bufferMode: value })}
            options={BUFFER_OPTIONS.map(({ value, label }) => ({
              value,
              label,
            }))}
          />
          <p className="mt-1 text-xs text-slate-400">
            Packing for <span className="font-semibold">{packDays}</span> day
            {packDays === 1 ? '' : 's'} of food
          </p>
        </Field>

        {packList.length === 0 ? (
          <div className="rounded-2xl bg-[#FBF9F5] p-4 text-center text-sm text-slate-500">
            Build a bowl mix (or save a primary food on the Pup tab) to see pack
            weights.
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pack summary
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {totalGrams > 0 ? (
                  <p>
                    <span className="text-3xl font-extrabold text-slate-800">
                      {totalGrams}
                    </span>
                    <span className="ml-1 text-sm font-semibold text-slate-500">
                      g total
                    </span>
                  </p>
                ) : null}
                <p>
                  <span className="text-3xl font-extrabold text-[#10B981]">
                    {totalKcal}
                  </span>
                  <span className="ml-1 text-sm font-semibold text-emerald-400">
                    kcal total
                  </span>
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {packList.map((item) => (
                <li
                  key={item.food.id}
                  className="rounded-2xl bg-[#FBF9F5] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.food.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.percentage}% of daily calories
                      </p>
                    </div>
                    <p className="text-right text-sm font-bold text-slate-800">
                      {formatPackAmounts(item)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  )
}
