import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import {
  ACTIVITY_OPTIONS,
  calculateDER,
  calculateRER,
  resolveGoalMultiplier,
} from '../../utils/calculations'
import DogPhotoPicker from './DogPhotoPicker'
import { EMPTY_DOG_DISLIKES, EMPTY_DOG_FAVORITES } from '../../utils/storage'
import { track } from '../../analytics'

const CALORIE_MODE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'calculator', label: 'Calculator' },
]

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
  calorieMode: 'manual',
  manualTargetKcal: '',
  activityLevel: 'neutered_adult',
  photoUrl: '',
  favorites: { ...EMPTY_DOG_FAVORITES },
  dislikes: { ...EMPTY_DOG_DISLIKES },
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
    ageYears:
      dog.ageYears != null && Number.isFinite(Number(dog.ageYears))
        ? String(dog.ageYears)
        : '',
    gender:
      dog.gender === 'male' || dog.gender === 'female' || dog.gender === 'unknown'
        ? dog.gender
        : 'unknown',
    weight: dog.weight?.toString() ?? '',
    weightUnit: dog.weightUnit ?? 'lbs',
    colors: dog.colors ?? '',
    breed: dog.breed ?? '',
    calorieMode,
    manualTargetKcal: seededTarget ? String(seededTarget) : '',
    activityLevel: dog.activityLevel ?? 'neutered_adult',
    photoUrl: dog.photoUrl ?? '',
    favorites: {
      ...EMPTY_DOG_FAVORITES,
      ...(dog.favorites ?? {}),
    },
    dislikes: {
      ...EMPTY_DOG_DISLIKES,
      ...(dog.dislikes ?? {}),
    },
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

/** Compact dog profile form — create or edit a pup. */
export default function ProfileEditor({
  addingNew = false,
  dogId = null,
  onAdded,
  onCancel,
}) {
  const { dogs, activeDog, dispatch, createId } = useApp()
  const editingDog = addingNew
    ? null
    : dogId
      ? (dogs.find((d) => d.id === dogId) ?? null)
      : activeDog
  const [form, setForm] = useState(() =>
    editingDog ? dogToForm(editingDog) : EMPTY_FORM,
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    setForm(editingDog ? dogToForm(editingDog) : EMPTY_FORM)
    setPhotoError('')
  }, [editingDog?.id, addingNew])

  const preview = previewFromForm(form)
  const isNew = addingNew || !editingDog
  const manualTarget = Number(form.manualTargetKcal)
  const hasManualTarget =
    form.calorieMode !== 'manual' ||
    (Number.isFinite(manualTarget) && manualTarget > 0)
  const canSave =
    form.name.trim().length > 0 &&
    Number(form.weight) > 0 &&
    Number.isFinite(Number(form.weight)) &&
    (isNew || hasManualTarget)

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

  function updateNote(group, field, value) {
    setForm((prev) => ({
      ...prev,
      [group]: { ...prev[group], [field]: value },
    }))
  }

  function handleSave(e) {
    e.preventDefault()
    if (!canSave) return

    const isManual = form.calorieMode === 'manual'
    const dogId = isNew ? createId('dog') : editingDog.id

    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        id: dogId,
        name: form.name.trim(),
        ageYears:
          form.ageYears === ''
            ? null
            : Number.isFinite(Number(form.ageYears))
              ? Number(form.ageYears)
              : null,
        gender:
          form.gender === 'male' || form.gender === 'female'
            ? form.gender
            : 'unknown',
        weight: Number(form.weight),
        weightUnit: form.weightUnit,
        colors: form.colors.trim(),
        breed: form.breed.trim(),
        calorieMode: isManual ? 'manual' : 'calculator',
        manualTargetKcal: isManual ? Math.round(Number(form.manualTargetKcal)) : null,
        goal: 'maintain',
        goalIntensity: 'moderate',
        activityLevel: form.activityLevel,
        photoUrl: form.photoUrl,
        primaryFood: isNew ? null : (editingDog?.primaryFood ?? null),
        careInfo: isNew ? undefined : (editingDog?.careInfo ?? undefined),
        mealsPerDay: isNew ? 2 : (editingDog?.mealsPerDay === 1 ? 1 : 2),
        favorites: {
          foodTreat: form.favorites.foodTreat.trim(),
          toyGame: form.favorites.toyGame.trim(),
          furiends: form.favorites.furiends.trim(),
        },
        dislikes: {
          people: form.dislikes.people.trim(),
          places: form.dislikes.places.trim(),
          things: form.dislikes.things.trim(),
        },
      },
    })
    track(isNew ? 'add_dog' : 'edit_dog', {
      calorie_mode: isManual ? 'Manual' : 'Calculator',
      has_photo: Boolean(form.photoUrl),
      pack_size: isNew ? dogs.length + 1 : dogs.length,
      source: isNew ? (addingNew ? 'Add dog' : 'First dog') : 'Edit profile',
    })
    setSavedFlash(true)
    onAdded?.(dogId)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  function handleRemove() {
    if (!editingDog) return
    dispatch({ type: 'REMOVE_DOG', payload: editingDog.id })
    track('remove_dog', { pack_size: Math.max(0, dogs.length - 1) })
    setConfirmRemove(false)
    onCancel?.()
  }

  const title = addingNew
    ? 'New pup'
    : editingDog
      ? 'Edit profile'
      : 'Meet your pup'
  const dogLabel = editingDog?.name?.trim() || 'this pup'

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
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">
            Daily target from weight &amp; life stage, or enter it manually.
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

        <Field label="Age (years)">
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

        <Field label="Color(s)">
          <input
            className={fieldClassName}
            value={form.colors}
            onChange={(e) => update('colors', e.target.value)}
            placeholder="e.g. black & white"
            autoComplete="off"
          />
        </Field>

        <Field label="Breed">
          <input
            className={fieldClassName}
            value={form.breed}
            onChange={(e) => update('breed', e.target.value)}
            placeholder="e.g. Labrador mix"
            autoComplete="off"
          />
        </Field>

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
              required={!isNew}
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

        <div className="space-y-3 border-t border-amber-100 pt-3">
          <p className="text-sm font-semibold text-slate-800">Favorites</p>
          <Field label="Food / Treat">
            <input
              className={fieldClassName}
              value={form.favorites.foodTreat}
              onChange={(e) => updateNote('favorites', 'foodTreat', e.target.value)}
              placeholder="e.g. peanut butter biscuits"
              autoComplete="off"
            />
          </Field>
          <Field label="Toy / Game">
            <input
              className={fieldClassName}
              value={form.favorites.toyGame}
              onChange={(e) => updateNote('favorites', 'toyGame', e.target.value)}
              placeholder="e.g. tug, fetch, snuffle mat"
              autoComplete="off"
            />
          </Field>
          <Field label="Furiends">
            <input
              className={fieldClassName}
              value={form.favorites.furiends}
              onChange={(e) => updateNote('favorites', 'furiends', e.target.value)}
              placeholder="e.g. the golden next door"
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="space-y-3 border-t border-amber-100 pt-3">
          <p className="text-sm font-semibold text-slate-800">Dislikes</p>
          <Field label="People">
            <input
              className={fieldClassName}
              value={form.dislikes.people}
              onChange={(e) => updateNote('dislikes', 'people', e.target.value)}
              placeholder="e.g. delivery drivers"
              autoComplete="off"
            />
          </Field>
          <Field label="Places">
            <input
              className={fieldClassName}
              value={form.dislikes.places}
              onChange={(e) => updateNote('dislikes', 'places', e.target.value)}
              placeholder="e.g. the vet, skate parks"
              autoComplete="off"
            />
          </Field>
          <Field label="Things">
            <input
              className={fieldClassName}
              value={form.dislikes.things}
              onChange={(e) => updateNote('dislikes', 'things', e.target.value)}
              placeholder="e.g. vacuums, skateboards"
              autoComplete="off"
            />
          </Field>
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

        {editingDog && !addingNew ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full !h-11 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => setConfirmRemove(true)}
          >
            Remove dog
          </Button>
        ) : null}
      </form>

      <Modal
        open={confirmRemove}
        title="Remove dog?"
        onClose={() => setConfirmRemove(false)}
      >
        <p className="text-sm text-slate-500">
          Remove {dogLabel} and their bowl plan from this device? Pantry foods
          stay. This cannot be undone.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            className="w-full !h-11 !bg-red-500 hover:!bg-red-600"
            onClick={handleRemove}
          >
            Remove {dogLabel}
          </Button>
          <Button
            variant="secondary"
            className="w-full !h-11"
            onClick={() => setConfirmRemove(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
