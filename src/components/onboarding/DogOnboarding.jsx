import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import DogPhotoPicker from '../profile/DogPhotoPicker'
import { useApp } from '../../context/AppContext'
import {
  EMPTY_DOG_DISLIKES,
  EMPTY_DOG_FAVORITES,
  normalizeDogAgeYears,
  normalizeDogGender,
} from '../../utils/storage'
import { DOG_PRESENCE, presencePatch } from '../../utils/dogs'
import { track } from '../../analytics'

const TOTAL_STEPS = 3

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
]

const EMPTY_FORM = {
  name: '',
  ageYears: '',
  gender: 'unknown',
  weight: '',
  weightUnit: 'lbs',
  colors: '',
  breed: '',
  photoUrl: '',
}

function StepDots({ step }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <span
            key={n}
            className={`h-2.5 rounded-full transition-all ${
              active
                ? 'w-6 bg-[#F59E0B]'
                : done
                  ? 'w-2.5 bg-amber-300'
                  : 'w-2.5 bg-amber-100'
            }`}
          />
        )
      })}
    </div>
  )
}

/** First-dog questionnaire: identity → appearance → meal plan or log. */
export default function DogOnboarding({ onComplete }) {
  const { dogs, dispatch, createId } = useApp()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [photoError, setPhotoError] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const canStep1 = form.name.trim().length > 0
  const weightNum = Number(form.weight)
  const canStep2 =
    Number.isFinite(weightNum) && weightNum > 0

  function saveDog(next) {
    if (saving || !canStep1 || !canStep2) return
    setSaving(true)

    const dogId = createId('dog')
    const ageYears = normalizeDogAgeYears(form.ageYears)
    const gender = normalizeDogGender(form.gender)
    // Meal plan → Tracking checklist; start logging → Active (log with +).
    const presence =
      next === 'menu' ? DOG_PRESENCE.tracking : DOG_PRESENCE.active

    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        id: dogId,
        name: form.name.trim(),
        ageYears,
        gender,
        weight: weightNum,
        weightUnit: form.weightUnit,
        colors: form.colors.trim(),
        breed: form.breed.trim(),
        calorieMode: 'calculator',
        manualTargetKcal: null,
        goal: 'maintain',
        goalIntensity: 'moderate',
        activityLevel: 'neutered_adult',
        photoUrl: form.photoUrl,
        primaryFood: null,
        mealsPerDay: 2,
        favorites: { ...EMPTY_DOG_FAVORITES },
        dislikes: { ...EMPTY_DOG_DISLIKES },
        ...presencePatch(presence),
      },
    })

    track('add_dog', {
      calorie_mode: 'Calculator',
      has_photo: Boolean(form.photoUrl),
      pack_size: dogs.length + 1,
      source: 'Onboarding',
      onboarding_next: next === 'menu' ? 'Menu' : 'Today',
      presence: presence === DOG_PRESENCE.active ? 'Active' : 'Tracking',
    })

    onComplete?.({ dogId, next })
  }

  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <DogPhotoPicker
          name={form.name}
          photoUrl={form.photoUrl}
          onChange={(photoUrl) => {
            update('photoUrl', photoUrl)
            setPhotoError('')
          }}
          onError={setPhotoError}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Meet your pup</h2>
          <p className="text-xs text-slate-500">
            {step === 1
              ? 'Add a photo if you like, then a few basics.'
              : step === 2
                ? 'Weight sets a daily calorie target. Looks are optional.'
                : 'Set a daily routine, or jump straight into logging.'}
          </p>
          {form.photoUrl ? (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
              onClick={() => {
                update('photoUrl', '')
                setPhotoError('')
              }}
            >
              Remove photo
            </button>
          ) : null}
          {photoError ? (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {photoError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <StepDots step={step} />
      </div>

      {step === 1 ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (canStep1) setStep(2)
          }}
        >
          <Field label="Name">
            <input
              className={fieldClassName}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Buster"
              autoComplete="off"
              autoFocus
              required
            />
          </Field>

          <Field label="Age (years)" hint="Optional">
            <input
              className={fieldClassName}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={form.ageYears}
              onChange={(e) => update('ageYears', e.target.value)}
              placeholder="e.g. 3"
            />
          </Field>

          <Field label="Gender">
            <SegmentedControl
              ariaLabel="Gender"
              value={form.gender}
              onChange={(value) => update('gender', value)}
              options={GENDER_OPTIONS}
            />
          </Field>

          <Button type="submit" className="w-full !h-11" disabled={!canStep1}>
            Continue
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (canStep2) setStep(3)
          }}
        >
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
                autoFocus
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

          <Field label="Color(s)" hint="Optional">
            <input
              className={fieldClassName}
              value={form.colors}
              onChange={(e) => update('colors', e.target.value)}
              placeholder="e.g. black & white"
              autoComplete="off"
            />
          </Field>

          <Field label="Breed" hint="Optional">
            <input
              className={fieldClassName}
              value={form.breed}
              onChange={(e) => update('breed', e.target.value)}
              placeholder="e.g. Labrador mix"
              autoComplete="off"
            />
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!h-11 flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button type="submit" className="!h-11 flex-1" disabled={!canStep2}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-500">
            A meal plan is {form.name.trim() || 'your pup'}’s daily routine —
            breakfast, meds, and the rest. Or start logging right away and set
            that up later.
          </p>

          <Button
            type="button"
            className="w-full !h-11"
            disabled={saving}
            onClick={() => saveDog('menu')}
          >
            Create a meal plan
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full !h-11"
            disabled={saving}
            onClick={() => saveDog('today')}
          >
            Start logging
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full !h-11"
            disabled={saving}
            onClick={() => setStep(2)}
          >
            Back
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
