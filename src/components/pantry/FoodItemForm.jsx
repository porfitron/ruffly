import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { FOOD_CATEGORIES } from '../../utils/calculations'
import { track } from '../../analytics'

const EMPTY = {
  brand: '',
  name: '',
  flavor: '',
  category: 'kibble',
  kcalPerKg: '',
  kcalPerCup: '',
  kcalPerCan: '',
  proteinPercent: '',
  fatPercent: '',
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
    proteinPercent: food.proteinPercent?.toString() ?? '',
    fatPercent: food.fatPercent?.toString() ?? '',
    productUrl: food.productUrl ?? '',
  }
}

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toPercentOrNull(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

/** P2 — Add / edit pantry food */
export default function FoodItemForm({
  editingFood = null,
  onDone,
  embedded = false,
  addToBowl = false,
  initialName = '',
  hideHeader = false,
}) {
  const { pantry, dispatch, createId } = useApp()
  const [form, setForm] = useState(() => {
    const base = foodToForm(editingFood)
    if (!editingFood && initialName) return { ...base, name: initialName }
    return base
  })
  const [expanded, setExpanded] = useState(
    () => embedded || Boolean(editingFood) || pantry.length === 0,
  )

  useEffect(() => {
    const base = foodToForm(editingFood)
    if (!editingFood && initialName) {
      setForm({ ...base, name: initialName })
    } else {
      setForm(base)
    }
    if (embedded || editingFood) {
      setExpanded(true)
    } else {
      setExpanded(pantry.length === 0)
    }
  }, [editingFood?.id, pantry.length, embedded, initialName])

  const hasDensity =
    toNumberOrNull(form.kcalPerKg) ||
    toNumberOrNull(form.kcalPerCup) ||
    toNumberOrNull(form.kcalPerCan)

  const canSave =
    form.brand.trim().length > 0 &&
    form.name.trim().length > 0 &&
    form.flavor.trim().length > 0 &&
    hasDensity
  const isEditing = Boolean(editingFood)
  const fieldId = editingFood?.id ?? (addToBowl ? 'bowl-new' : 'new')

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
      formula: form.name.trim(),
      flavor: form.flavor.trim(),
      category: form.category,
      kcalPerKg: toNumberOrNull(form.kcalPerKg),
      kcalPerCup: toNumberOrNull(form.kcalPerCup),
      kcalPerCan: toNumberOrNull(form.kcalPerCan),
      proteinPercent: toPercentOrNull(form.proteinPercent),
      fatPercent: toPercentOrNull(form.fatPercent),
      productUrl: form.productUrl.trim(),
    }

    dispatch({ type: 'UPSERT_FOOD', payload: food })
    track(isEditing ? 'edit_catalog_item' : 'add_catalog_item', {
      item_kind: 'Food',
      source: addToBowl ? 'Bowl' : 'Catalog',
    })
    if (addToBowl && !isEditing) {
      dispatch({ type: 'ADD_TO_MEAL', payload: food.id })
    }
    setForm(EMPTY)
    if (!embedded) setExpanded(false)
    onDone?.()
  }

  function handleCancel() {
    setForm(EMPTY)
    if (!embedded) setExpanded(pantry.length === 0)
    onDone?.()
  }

  function handleDelete() {
    if (!editingFood) return
    dispatch({ type: 'REMOVE_FOOD', payload: editingFood.id })
    track('remove_catalog_item', { item_kind: 'Food', source: 'Catalog' })
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
              {addToBowl ? 'Bowl' : 'Pantry'}
            </p>
            <p className="truncate text-lg font-bold text-slate-800">
              {addToBowl ? 'Create new food' : 'Add food'}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {addToBowl
                ? 'Saves to My Pantry and adds it to this bowl'
                : pantry.length > 0
                  ? `${pantry.length} saved · tap to add another`
                  : null}
            </p>
          </div>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-light leading-none text-[#F59E0B]"
            aria-hidden
          >
            +
          </span>
          <span className="sr-only">
            {addToBowl ? 'Expand to create food' : 'Expand to add food'}
          </span>
        </button>
      </Card>
    )
  }

  const body = (
    <>
      {hideHeader ? null : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800">
              {isEditing
                ? 'Edit food'
                : addToBowl
                  ? 'Create new food'
                  : 'Add food'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {addToBowl
                ? 'Saved to your catalog and mixed into this bowl automatically.'
                : 'Brand, formula, flavor, and calories from the label.'}
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
      )}

      <form
        className={`${hideHeader ? '' : 'mt-4 '}space-y-3`}
        onSubmit={handleSubmit}
      >
        <Field label="Brand" htmlFor={`food-brand-${fieldId}`}>
          <input
            id={`food-brand-${fieldId}`}
            className={fieldClassName}
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
            placeholder="Orijen"
            required
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
            required
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

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Protein %"
            htmlFor={`food-protein-${fieldId}`}
            hint="From the label"
          >
            <input
              id={`food-protein-${fieldId}`}
              className={fieldClassName}
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={form.proteinPercent}
              onChange={(e) => update('proteinPercent', e.target.value)}
              placeholder="38"
            />
          </Field>
          <Field
            label="Fat %"
            htmlFor={`food-fat-${fieldId}`}
            hint="From the label"
          >
            <input
              id={`food-fat-${fieldId}`}
              className={fieldClassName}
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={form.fatPercent}
              onChange={(e) => update('fatPercent', e.target.value)}
              placeholder="18"
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
            {isEditing
              ? 'Update food'
              : addToBowl
                ? 'Save & add to bowl'
                : 'Save to pantry'}
          </Button>
        </div>

        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-rose-500 hover:bg-rose-50"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            Delete food
          </Button>
        ) : null}
      </form>
    </>
  )

  if (embedded) return body
  return <Card>{body}</Card>
}
