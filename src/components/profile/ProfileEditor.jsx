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
import DogAvatar from './DogAvatar'

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

/** Compact dog profile form — create or edit the active pup. */
export default function ProfileEditor({
  addingNew = false,
  onAdded,
  onCancel,
}) {
  const { activeDog, dispatch, createId } = useApp()
  const editingDog = addingNew ? null : activeDog
  const [form, setForm] = useState(() =>
    editingDog ? dogToForm(editingDog) : EMPTY_FORM,
  )
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setForm(editingDog ? dogToForm(editingDog) : EMPTY_FORM)
  }, [editingDog?.id, addingNew])

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
    const isNew = addingNew || !editingDog

    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        id: isNew ? createId('dog') : editingDog.id,
        name: form.name.trim(),
        weight: Number(form.weight),
        weightUnit: form.weightUnit,
        calorieMode: isManual ? 'manual' : 'calculator',
        manualTargetKcal: isManual ? Math.round(Number(form.manualTargetKcal)) : null,
        goal: 'maintain',
        goalIntensity: 'moderate',
        activityLevel: form.activityLevel,
        photoUrl: form.photoUrl,
        primaryFood: isNew ? null : (editingDog?.primaryFood ?? null),
        careInfo: isNew ? undefined : (editingDog?.careInfo ?? undefined),
        mealsPerDay: isNew ? 2 : (editingDog?.mealsPerDay === 1 ? 1 : 2),
      },
    })
    setSavedFlash(true)
    onAdded?.()
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  const title = addingNew
    ? 'New pup'
    : editingDog
      ? 'Edit profile'
      : 'Meet your pup'

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <DogAvatar name={form.name} photoUrl={form.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">
            Daily target from weight &amp; life stage, or enter it manually.
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={onCancel}
            aria-label="Close editor"
          >
            ×
          </button>
        ) : null}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSave}>
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

        <Field label="Target calories">
          <SegmentedControl
            ariaLabel="Target calories mode"
            value={form.calorieMode}
            onChange={(value) => update('calorieMode', value)}
            options={CALORIE_MODE_OPTIONS}
          />
        </Field>

        {form.calorieMode === 'manual' ? (
          <Field label="Daily total (kcal)">
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

        <div className="rounded-2xl bg-[#FBF9F5] px-3 py-3">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-slate-400">RER</dt>
              <dd className="text-base font-extrabold text-slate-800">
                {preview.rer || '—'}
                <span className="ml-1 text-xs font-semibold text-slate-400">
                  kcal
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Daily target</dt>
              <dd className="text-base font-extrabold text-[#10B981]">
                {preview.der || '—'}
                <span className="ml-1 text-xs font-semibold text-emerald-400">
                  kcal
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <Button type="submit" className="w-full !h-11" disabled={!canSave}>
          {savedFlash
            ? 'Saved'
            : addingNew
              ? 'Save new pup'
              : editingDog
                ? 'Save changes'
                : 'Save pup profile'}
        </Button>
      </form>
    </Card>
  )
}
