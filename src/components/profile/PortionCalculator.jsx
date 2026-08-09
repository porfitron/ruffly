import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import {
  calculateServingCups,
  calculateServingGrams,
} from '../../utils/calculations'

const EMPTY_FOOD = {
  name: '',
  densityMode: 'kcalPerKg',
  kcalPerKg: '',
  kcalPerCup: '',
}

function foodToForm(food) {
  if (!food) return EMPTY_FOOD
  return {
    name: food.name ?? '',
    densityMode: food.kcalPerKg ? 'kcalPerKg' : 'kcalPerCup',
    kcalPerKg: food.kcalPerKg?.toString() ?? '',
    kcalPerCup: food.kcalPerCup?.toString() ?? '',
  }
}

/** P1 — Convert DER into daily grams (and cups when available) */
export default function PortionCalculator() {
  const { activeDog, dispatch } = useApp()
  const [form, setForm] = useState(() => foodToForm(activeDog?.primaryFood))
  const [savedFlash, setSavedFlash] = useState(false)
  const [expanded, setExpanded] = useState(() => !activeDog?.primaryFood)

  useEffect(() => {
    setForm(foodToForm(activeDog?.primaryFood))
    setExpanded(!activeDog?.primaryFood)
  }, [activeDog?.id, activeDog?.primaryFood?.name])

  if (!activeDog) return null

  const der = activeDog.targetDER ?? 0
  const kcalPerKg = Number(form.kcalPerKg)
  const kcalPerCup = Number(form.kcalPerCup)

  const dailyGrams =
    form.densityMode === 'kcalPerKg' || kcalPerKg > 0
      ? calculateServingGrams(der, kcalPerKg)
      : 0
  const dailyCups =
    form.densityMode === 'kcalPerCup' || kcalPerCup > 0
      ? calculateServingCups(der, kcalPerCup)
      : 0

  const hasGrams = dailyGrams > 0
  const hasCups = dailyCups > 0
  const canSave =
    (form.densityMode === 'kcalPerKg' && kcalPerKg > 0) ||
    (form.densityMode === 'kcalPerCup' && kcalPerCup > 0)
  const isComplete = Boolean(activeDog.primaryFood)
  const foodName = activeDog.primaryFood?.name || form.name.trim() || 'Primary food'
  const summaryParts = []
  if (hasGrams) summaryParts.push(`${dailyGrams} g/day`)
  if (hasCups) summaryParts.push(`${dailyCups} cups/day`)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    if (!canSave) return

    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        ...activeDog,
        primaryFood: {
          name: form.name.trim() || 'Primary food',
          kcalPerKg: kcalPerKg > 0 ? kcalPerKg : null,
          kcalPerCup: kcalPerCup > 0 ? kcalPerCup : null,
        },
      },
    })
    setSavedFlash(true)
    setExpanded(false)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  if (isComplete && !expanded) {
    return (
      <Card>
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Daily portion
            </p>
            <p className="truncate text-lg font-bold text-slate-800">
              {foodName}
            </p>
            {summaryParts.length > 0 ? (
              <p className="mt-0.5 text-sm font-semibold text-[#10B981]">
                {summaryParts.join(' · ')}
              </p>
            ) : null}
          </div>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-light leading-none text-[#F59E0B]"
            aria-hidden
          >
            +
          </span>
          <span className="sr-only">Expand to edit</span>
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800">Daily portion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter this food&apos;s calorie density to convert{' '}
            <span className="font-semibold text-[#10B981]">{der} kcal</span>{' '}
            into precise grams.
          </p>
        </div>
        {isComplete ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={() => setExpanded(false)}
            aria-expanded={true}
            aria-label="Collapse daily portion"
          >
            −
          </button>
        ) : null}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSave}>
        <Field label="Food name" hint="Optional for now — pantry comes in P2">
          <input
            className={fieldClassName}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Orijen Original"
            autoComplete="off"
          />
        </Field>

        <Field label="Density unit">
          <SegmentedControl
            ariaLabel="Density unit"
            value={form.densityMode}
            onChange={(value) => update('densityMode', value)}
            options={[
              { value: 'kcalPerKg', label: 'kcal/kg' },
              { value: 'kcalPerCup', label: 'kcal/cup' },
            ]}
          />
        </Field>

        {form.densityMode === 'kcalPerKg' ? (
          <Field
            label="kcal per kg"
            hint="Usually printed on the bag as kcal/kg or kcal/1000g"
          >
            <input
              className={fieldClassName}
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={form.kcalPerKg}
              onChange={(e) => update('kcalPerKg', e.target.value)}
              placeholder="3940"
              required
            />
          </Field>
        ) : (
          <Field label="kcal per cup" hint="Guaranteed analysis / feeding guide">
            <input
              className={fieldClassName}
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={form.kcalPerCup}
              onChange={(e) => update('kcalPerCup', e.target.value)}
              placeholder="473"
              required
            />
          </Field>
        )}

        {(hasGrams || hasCups) && (
          <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Suggested daily feeding
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
              {hasGrams ? (
                <p>
                  <span className="text-3xl font-extrabold text-slate-800">
                    {dailyGrams}
                  </span>
                  <span className="ml-1 text-sm font-semibold text-slate-500">
                    g / day
                  </span>
                </p>
              ) : null}
              {hasCups ? (
                <p>
                  <span className="text-3xl font-extrabold text-slate-800">
                    {dailyCups}
                  </span>
                  <span className="ml-1 text-sm font-semibold text-slate-500">
                    cups / day
                  </span>
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MealChip
                label="Breakfast"
                grams={hasGrams ? Math.round(dailyGrams / 2) : null}
                cups={hasCups ? Math.round((dailyCups / 2) * 10) / 10 : null}
              />
              <MealChip
                label="Dinner"
                grams={hasGrams ? Math.round(dailyGrams / 2) : null}
                cups={hasCups ? Math.round((dailyCups / 2) * 10) / 10 : null}
              />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!canSave}>
          {savedFlash ? 'Portion saved' : 'Save portion settings'}
        </Button>
      </form>
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
