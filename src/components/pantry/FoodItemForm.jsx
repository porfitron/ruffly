import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { FOOD_CATEGORIES } from '../../utils/calculations'

const EMPTY = {
  brand: '',
  name: '',
  flavor: '',
  category: 'kibble',
  kcalPerKg: '',
  kcalPerCup: '',
  kcalPerCan: '',
  productUrl: '',
}

function foodToForm(food) {
  if (!food) return EMPTY
  return {
    brand: food.brand ?? '',
    name: food.name ?? '',
    flavor: food.flavor ?? '',
    category: food.category ?? 'kibble',
    kcalPerKg: food.kcalPerKg?.toString() ?? '',
    kcalPerCup: food.kcalPerCup?.toString() ?? '',
    kcalPerCan: food.kcalPerCan?.toString() ?? '',
    productUrl: food.productUrl ?? '',
  }
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** P2 — Add / edit pantry food */
export default function FoodItemForm({
  editingFood = null,
  onDone,
  embedded = false,
}) {
  const { pantry, dispatch, createId } = useApp()
  const [form, setForm] = useState(() => foodToForm(editingFood))
  const [expanded, setExpanded] = useState(
    () => embedded || Boolean(editingFood) || pantry.length === 0,
  )

  useEffect(() => {
    setForm(foodToForm(editingFood))
    if (embedded || editingFood) {
      setExpanded(true)
    } else {
      setExpanded(pantry.length === 0)
    }
  }, [editingFood?.id, pantry.length, embedded])

  const hasDensity =
    toNumberOrNull(form.kcalPerKg) ||
    toNumberOrNull(form.kcalPerCup) ||
    toNumberOrNull(form.kcalPerCan)

  const canSave = form.name.trim().length > 0 && hasDensity
  const isEditing = Boolean(editingFood)
  const fieldId = editingFood?.id ?? 'new'

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return

    const food = {
      id: editingFood?.id ?? createId('food'),
      brand: form.brand.trim(),
      name: form.name.trim(),
      flavor: form.flavor.trim(),
      category: form.category,
      kcalPerKg: toNumberOrNull(form.kcalPerKg),
      kcalPerCup: toNumberOrNull(form.kcalPerCup),
      kcalPerCan: toNumberOrNull(form.kcalPerCan),
      productUrl: form.productUrl.trim(),
    }

    dispatch({ type: 'UPSERT_FOOD', payload: food })
    setForm(EMPTY)
    if (!embedded) setExpanded(false)
    onDone?.()
  }

  function handleCancel() {
    setForm(EMPTY)
    if (!embedded) setExpanded(pantry.length === 0)
    onDone?.()
  }

  if (!embedded && !expanded) {
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
              Pantry
            </p>
            <p className="truncate text-lg font-bold text-slate-800">Add food</p>
            {pantry.length > 0 ? (
              <p className="mt-0.5 text-sm text-slate-500">
                {pantry.length} saved · tap to add another
              </p>
            ) : null}
          </div>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-light leading-none text-[#F59E0B]"
            aria-hidden
          >
            +
          </span>
          <span className="sr-only">Expand to add food</span>
        </button>
      </Card>
    )
  }

  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Edit food' : 'Add food'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Save density + a reorder link so the bowl balancer can portion
            precisely.
          </p>
        </div>
        {isEditing || (!isEditing && pantry.length > 0) ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={handleCancel}
            aria-expanded={true}
            aria-label={isEditing ? 'Cancel edit' : 'Collapse add food'}
          >
            −
          </button>
        ) : null}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Field label="Brand" htmlFor={`food-brand-${fieldId}`}>
          <input
            id={`food-brand-${fieldId}`}
            className={fieldClassName}
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
            placeholder="Orijen"
          />
        </Field>

        <Field label="Formula" htmlFor={`food-name-${fieldId}`}>
          <input
            id={`food-name-${fieldId}`}
            className={fieldClassName}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Original Grain-Free"
            required
          />
        </Field>

        <Field label="Flavor" htmlFor={`food-flavor-${fieldId}`}>
          <input
            id={`food-flavor-${fieldId}`}
            className={fieldClassName}
            value={form.flavor}
            onChange={(e) => update('flavor', e.target.value)}
            placeholder="Chicken"
          />
        </Field>

        <Field label="Category" htmlFor={`food-category-${fieldId}`}>
          <select
            id={`food-category-${fieldId}`}
            className={fieldClassName}
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {FOOD_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            label="kcal / kg"
            htmlFor={`food-kg-${fieldId}`}
            hint="Best for grams"
          >
            <input
              id={`food-kg-${fieldId}`}
              className={fieldClassName}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={form.kcalPerKg}
              onChange={(e) => update('kcalPerKg', e.target.value)}
              placeholder="3940"
            />
          </Field>
          <Field label="kcal / cup" htmlFor={`food-cup-${fieldId}`}>
            <input
              id={`food-cup-${fieldId}`}
              className={fieldClassName}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={form.kcalPerCup}
              onChange={(e) => update('kcalPerCup', e.target.value)}
              placeholder="473"
            />
          </Field>
          <Field label="kcal / can" htmlFor={`food-can-${fieldId}`}>
            <input
              id={`food-can-${fieldId}`}
              className={fieldClassName}
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={form.kcalPerCan}
              onChange={(e) => update('kcalPerCan', e.target.value)}
              placeholder="350"
            />
          </Field>
        </div>

        <Field
          label="Reorder URL"
          htmlFor={`food-url-${fieldId}`}
          hint="Chewy, Amazon, brand site…"
        >
          <input
            id={`food-url-${fieldId}`}
            className={fieldClassName}
            type="url"
            value={form.productUrl}
            onChange={(e) => update('productUrl', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <div className="flex gap-2 pt-1">
          {isEditing ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" className="flex-1" disabled={!canSave}>
            {isEditing ? 'Update food' : 'Save to pantry'}
          </Button>
        </div>
      </form>
    </>
  )

  if (embedded) return body
  return <Card>{body}</Card>
}
