import { Field, fieldClassName } from '../ui/Field'

export function emptyFoodCreate(seedName = '') {
  return {
    brand: '',
    formula: seedName,
    flavor: '',
    defaultAmount: '',
    unit: 'g',
    kcalPerKg: '',
    kcalPerCup: '',
    kcalPerCan: '',
  }
}

export function emptyNonFoodCreate(kind, seedName = '') {
  return {
    name: seedName,
    brand: '',
    defaultAmount: '',
    unit: kind === 'weight' ? 'lbs' : 'tablet',
  }
}

export function emptyCreate(kind, seedName = '') {
  if (kind === 'food') return emptyFoodCreate(seedName)
  return emptyNonFoodCreate(kind, seedName)
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function foodCreateHasKcal(form) {
  return Boolean(
    toNumberOrNull(form.kcalPerKg) ||
      toNumberOrNull(form.kcalPerCup) ||
      toNumberOrNull(form.kcalPerCan),
  )
}

export function foodCreateIsValid(form) {
  return (
    Boolean(form.brand?.trim()) &&
    Boolean(form.formula?.trim()) &&
    Boolean(form.flavor?.trim()) &&
    foodCreateHasKcal(form)
  )
}

/** Build a catalog food care item from the create form. */
export function buildFoodCareItem(form, id) {
  const formula = form.formula.trim()
  const brand = form.brand.trim()
  const flavor = form.flavor.trim()
  const defaultAmount = form.defaultAmount
    ? Number(form.defaultAmount)
    : null
  return {
    id,
    kind: 'food',
    name: formula,
    formula,
    brand,
    flavor,
    notes: '',
    category: 'kibble',
    defaultAmount: Number.isFinite(defaultAmount) ? defaultAmount : null,
    unit: form.unit.trim() || 'g',
    kcalPerUnit: null,
    kcalPerKg: toNumberOrNull(form.kcalPerKg),
    kcalPerCup: toNumberOrNull(form.kcalPerCup),
    kcalPerCan: toNumberOrNull(form.kcalPerCan),
    productUrl: '',
  }
}

export function foodListLabel(item) {
  if (!item) return 'Untitled food'
  const formula = item.formula?.trim() || item.name?.trim() || 'Untitled food'
  const parts = [item.brand?.trim(), formula, item.flavor?.trim()].filter(
    Boolean,
  )
  return parts.join(' · ')
}

/** Shared Brand / Formula / Flavor / kcal fields for creating food. */
export default function FoodCreateFields({
  form,
  onChange,
  idPrefix = 'food-create',
  showServing = true,
}) {
  function update(field, value) {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="space-y-3">
      <Field label="Brand" htmlFor={`${idPrefix}-brand`}>
        <input
          id={`${idPrefix}-brand`}
          className={fieldClassName}
          value={form.brand}
          onChange={(e) => update('brand', e.target.value)}
          placeholder="e.g. Orijen"
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Formula" htmlFor={`${idPrefix}-formula`}>
        <input
          id={`${idPrefix}-formula`}
          className={fieldClassName}
          value={form.formula}
          onChange={(e) => update('formula', e.target.value)}
          placeholder="e.g. Original Grain-Free"
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Flavor" htmlFor={`${idPrefix}-flavor`}>
        <input
          id={`${idPrefix}-flavor`}
          className={fieldClassName}
          value={form.flavor}
          onChange={(e) => update('flavor', e.target.value)}
          placeholder="e.g. Chicken"
          autoComplete="off"
          required
        />
      </Field>

      <div>
        <p className="text-sm font-medium text-slate-700">Calories</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Enter at least one from the bag or can label.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="kcal / kg" htmlFor={`${idPrefix}-kcal-kg`}>
            <input
              id={`${idPrefix}-kcal-kg`}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              className={fieldClassName}
              value={form.kcalPerKg}
              onChange={(e) => update('kcalPerKg', e.target.value)}
              placeholder="3940"
            />
          </Field>
          <Field label="kcal / cup" htmlFor={`${idPrefix}-kcal-cup`}>
            <input
              id={`${idPrefix}-kcal-cup`}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              className={fieldClassName}
              value={form.kcalPerCup}
              onChange={(e) => update('kcalPerCup', e.target.value)}
              placeholder="473"
            />
          </Field>
          <Field label="kcal / can" htmlFor={`${idPrefix}-kcal-can`}>
            <input
              id={`${idPrefix}-kcal-can`}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              className={fieldClassName}
              value={form.kcalPerCan}
              onChange={(e) => update('kcalPerCan', e.target.value)}
              placeholder="350"
            />
          </Field>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          At least one kcal value is required (from the label).
        </p>
      </div>

      {showServing ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Typical amount" htmlFor={`${idPrefix}-amt`}>
            <input
              id={`${idPrefix}-amt`}
              type="number"
              inputMode="decimal"
              className={fieldClassName}
              value={form.defaultAmount}
              onChange={(e) => update('defaultAmount', e.target.value)}
              placeholder="200"
            />
          </Field>
          <Field label="Unit" htmlFor={`${idPrefix}-unit`}>
            <input
              id={`${idPrefix}-unit`}
              className={fieldClassName}
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              placeholder="g"
            />
          </Field>
        </div>
      ) : null}
    </div>
  )
}
