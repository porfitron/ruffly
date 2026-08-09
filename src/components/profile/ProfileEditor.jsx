import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import {
  ACTIVITY_OPTIONS,
  calculateDER,
  calculateRER,
  resolveGoalMultiplier,
} from '../../utils/calculations'

const CALORIE_MODE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'calculator', label: 'Calculator' },
]

const EMPTY_FORM = {
  name: '',
  weight: '',
  weightUnit: 'lbs',
  calorieMode: 'manual',
  manualTargetKcal: '',
  activityLevel: 'neutered_adult',
  photoUrl: '',
}

function dogToForm(dog) {
  // Legacy maintain/loss/gain dogs without calorieMode: keep their DER
  // by opening in Manual when they used a weight-goal multiplier.
  const calorieMode =
    dog.calorieMode === 'manual' ||
    (!dog.calorieMode && (dog.goal === 'loss' || dog.goal === 'gain'))
      ? 'manual'
      : 'calculator'
  const seededTarget =
    dog.manualTargetKcal != null && Number(dog.manualTargetKcal) > 0
      ? dog.manualTargetKcal
      : dog.targetDER
  return {
    name: dog.name ?? '',
    weight: dog.weight?.toString() ?? '',
    weightUnit: dog.weightUnit ?? 'lbs',
    calorieMode,
    manualTargetKcal: seededTarget ? String(seededTarget) : '',
    activityLevel: dog.activityLevel ?? 'neutered_adult',
    photoUrl: dog.photoUrl ?? '',
  }
}

function previewFromForm(form) {
  const weight = Number(form.weight)
  const rer = calculateRER(weight, form.weightUnit)

  if (form.calorieMode === 'manual') {
    const manual = Number(form.manualTargetKcal)
    const der = Number.isFinite(manual) && manual > 0 ? Math.round(manual) : 0
    return { rer, der, multiplier: 0 }
  }

  const multiplier = resolveGoalMultiplier('maintain', form.activityLevel)
  const der = calculateDER(rer, multiplier)
  return { rer, der, multiplier }
}

function Avatar({ name, size = 'lg' }) {
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '?'
  const sizeClass =
    size === 'sm'
      ? 'h-12 w-12 text-lg rounded-2xl'
      : 'h-16 w-16 text-2xl rounded-3xl'

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-amber-100 font-extrabold text-[#F59E0B] ${sizeClass}`}
      aria-hidden
    >
      {initial}
    </div>
  )
}

/** P1 — Dog profile setup with live RER/DER */
export default function ProfileEditor() {
  const { activeDog, dispatch, createId } = useApp()
  const [form, setForm] = useState(() =>
    activeDog ? dogToForm(activeDog) : EMPTY_FORM,
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [expanded, setExpanded] = useState(() => !activeDog)

  useEffect(() => {
    setForm(activeDog ? dogToForm(activeDog) : EMPTY_FORM)
    setExpanded(!activeDog)
  }, [activeDog?.id])

  const preview = previewFromForm(form)
  const manualTarget = Number(form.manualTargetKcal)
  const hasManualTarget =
    form.calorieMode !== 'manual' ||
    (Number.isFinite(manualTarget) && manualTarget > 0)
  const canSave =
    form.name.trim().length > 0 &&
    Number(form.weight) > 0 &&
    Number.isFinite(Number(form.weight)) &&
    hasManualTarget
  const isComplete = Boolean(activeDog)
  const displayName = activeDog?.name || form.name.trim() || 'Your pup'

  function update(field, value) {
    setForm((prev) => {
      if (field === 'calorieMode' && value === 'manual') {
        const nextPreview = previewFromForm({ ...prev, calorieMode: 'calculator' })
        const hasTarget =
          Number(prev.manualTargetKcal) > 0 &&
          Number.isFinite(Number(prev.manualTargetKcal))
        return {
          ...prev,
          calorieMode: value,
          manualTargetKcal: hasTarget
            ? prev.manualTargetKcal
            : nextPreview.der
              ? String(nextPreview.der)
              : prev.manualTargetKcal,
        }
      }
      return { ...prev, [field]: value }
    })
  }

  function handleSave(e) {
    e.preventDefault()
    if (!canSave) return

    const isManual = form.calorieMode === 'manual'

    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        id: activeDog?.id ?? createId('dog'),
        name: form.name.trim(),
        weight: Number(form.weight),
        weightUnit: form.weightUnit,
        calorieMode: isManual ? 'manual' : 'calculator',
        manualTargetKcal: isManual ? Math.round(Number(form.manualTargetKcal)) : null,
        goal: 'maintain',
        goalIntensity: 'moderate',
        activityLevel: form.activityLevel,
        photoUrl: form.photoUrl,
        primaryFood: activeDog?.primaryFood ?? null,
        careInfo: activeDog?.careInfo ?? undefined,
        mealsPerDay: activeDog?.mealsPerDay === 1 ? 1 : 2,
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
          <Avatar name={displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pup profile
            </p>
            <p className="truncate text-lg font-bold text-slate-800">
              {displayName}
            </p>
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
      <div className="flex items-start gap-4">
        <Avatar name={form.name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800">
            {activeDog ? 'Edit pup profile' : 'Meet your pup'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set a daily calorie target manually, or calculate it from weight and
            life stage.
          </p>
        </div>
        {isComplete ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={() => setExpanded(false)}
            aria-expanded={true}
            aria-label="Collapse pup profile"
          >
            −
          </button>
        ) : null}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSave}>
        <Field label="Name">
          <input
            className={fieldClassName}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Buster"
            autoComplete="off"
            required
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Weight">
            <input
              className={fieldClassName}
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={form.weight}
              onChange={(e) => update('weight', e.target.value)}
              placeholder="45"
              required
            />
          </Field>
          <Field label="Unit" className="w-28">
            <SegmentedControl
              ariaLabel="Weight unit"
              value={form.weightUnit}
              onChange={(value) => update('weightUnit', value)}
              options={[
                { value: 'lbs', label: 'lbs' },
                { value: 'kg', label: 'kg' },
              ]}
            />
          </Field>
        </div>

        <Field label="Target Calories per Day">
          <SegmentedControl
            ariaLabel="Target calories mode"
            value={form.calorieMode}
            onChange={(value) => update('calorieMode', value)}
            options={CALORIE_MODE_OPTIONS}
          />
        </Field>

        {form.calorieMode === 'manual' ? (
          <Field
            label="Daily total target"
            hint="Enter the total kcal you want to feed per day."
          >
            <input
              className={fieldClassName}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.manualTargetKcal}
              onChange={(e) => update('manualTargetKcal', e.target.value)}
              placeholder="e.g. 850"
              required
            />
          </Field>
        ) : (
          <Field label="Life stage & activity">
            <select
              className={fieldClassName}
              value={form.activityLevel}
              onChange={(e) => update('activityLevel', e.target.value)}
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.multiplier}× RER)
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="rounded-3xl bg-[#FBF9F5] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Live estimate
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-slate-500">RER</dt>
              <dd className="text-lg font-extrabold text-slate-800">
                {preview.rer || '—'}
                <span className="ml-1 text-sm font-semibold text-slate-400">
                  kcal
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Daily target (DER)</dt>
              <dd className="text-lg font-extrabold text-[#10B981]">
                {preview.der || '—'}
                <span className="ml-1 text-sm font-semibold text-emerald-400">
                  kcal
                </span>
              </dd>
            </div>
          </dl>
          {form.calorieMode === 'calculator' && preview.multiplier > 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Using {preview.multiplier}× RER multiplier
            </p>
          ) : null}
          {form.calorieMode === 'manual' && preview.der > 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Using your manual daily target
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={!canSave}>
          {savedFlash
            ? 'Saved to this phone'
            : activeDog
              ? 'Save changes'
              : 'Save pup profile'}
        </Button>
      </form>
    </Card>
  )
}
