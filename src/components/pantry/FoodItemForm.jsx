import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { FOOD_CATEGORIES } from '../../utils/calculations'

const EMPTY = {
  name: '',
  brand: '',
  category: 'kibble',
  kcalPerKg: '',
  kcalPerCup: '',
  kcalPerCan: '',
  productUrl: '',
}

function foodToForm(food) {
  if (!food) return EMPTY
  return {
    name: food.name ?? '',
    brand: food.brand ?? '',
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
export default function FoodItemForm({ editingFood = null, onDone }) {
  const { dispatch, createId } = useApp()
  const [form, setForm] = useState(() => foodToForm(editingFood))

  useEffect(() => {
    setForm(foodToForm(editingFood))
  }, [editingFood?.id])

  const hasDensity =
    toNumberOrNull(form.kcalPerKg) ||
    toNumberOrNull(form.kcalPerCup) ||
    toNumberOrNull(form.kcalPerCan)

  const canSave = form.name.trim().length > 0 && hasDensity

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return

    const food = {
      id: editingFood?.id ?? createId('food'),
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      kcalPerKg: toNumberOrNull(form.kcalPerKg),
      kcalPerCup: toNumberOrNull(form.kcalPerCup),
      kcalPerCan: toNumberOrNull(form.kcalPerCan),
      productUrl: form.productUrl.trim(),
    }

    dispatch({ type: 'UPSERT_FOOD', payload: food })
    setForm(EMPTY)
    onDone?.()
  }

  function handleCancel() {
    setForm(EMPTY)
    onDone?.()
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-800">
        {editingFood ? 'Edit food' : 'Add food'}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Save density + a reorder link so the bowl balancer can portion precisely.
      </p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Field label="Name" htmlFor="food-name">
          <input
            id="food-name"
            className={fieldClassName}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Original Grain-Free"
            required
          />
        </Field>

        <Field label="Brand" htmlFor="food-brand">
          <input
            id="food-brand"
            className={fieldClassName}
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
            placeholder="Orijen"
          />
        </Field>

        <Field label="Category" htmlFor="food-category">
          <select
            id="food-category"
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
          <Field label="kcal / kg" htmlFor="food-kg" hint="Best for grams">
            <input
              id="food-kg"
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
          <Field label="kcal / cup" htmlFor="food-cup">
            <input
              id="food-cup"
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
          <Field label="kcal / can" htmlFor="food-can">
            <input
              id="food-can"
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
          htmlFor="food-url"
          hint="Chewy, Amazon, brand site…"
        >
          <input
            id="food-url"
            className={fieldClassName}
            type="url"
            value={form.productUrl}
            onChange={(e) => update('productUrl', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <div className="flex gap-2 pt-1">
          {editingFood ? (
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
            {editingFood ? 'Update food' : 'Save to pantry'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
