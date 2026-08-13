import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { getCategoryLabel } from '../../utils/calculations'
import { kindLabel } from '../../utils/todayCare'
import FoodItemForm from '../pantry/FoodItemForm'
import FoodCreateFields, {
  emptyCreate,
  foodCreateIsValid,
  buildFoodCareItem,
  foodListLabel,
} from './FoodCreateFields'

const KIND_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'med', label: 'Meds' },
  { value: 'supplement', label: 'Supps' },
]

const CREATE_KINDS = [
  { value: 'food', label: 'Food' },
  { value: 'med', label: 'Med' },
  { value: 'supplement', label: 'Supp' },
]

function itemMatchesQuery(item, query) {
  if (!query) return true
  const haystack = [
    item.brand,
    item.name,
    item.formula,
    item.flavor,
    item.kind,
    item.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function densitySummary(item) {
  const bits = []
  if (item.kcalPerKg) bits.push(`${item.kcalPerKg} kcal/kg`)
  if (item.kcalPerCup) bits.push(`${item.kcalPerCup} kcal/cup`)
  if (item.kcalPerCan) bits.push(`${item.kcalPerCan} kcal/can`)
  return bits.join(' · ')
}

function NonFoodEditor({ item, kind, initialName = '', onDone }) {
  const { dispatch, createId } = useApp()
  const isEdit = Boolean(item)
  const [form, setForm] = useState(() =>
    item
      ? {
          name: item.name ?? '',
          brand: item.brand ?? '',
          defaultAmount:
            item.defaultAmount != null ? String(item.defaultAmount) : '',
          unit: item.unit ?? 'tablet',
          notes: item.notes ?? '',
        }
      : emptyCreate(kind, initialName),
  )

  const canSave = Boolean(form.name?.trim())

  function handleSave(e) {
    e.preventDefault()
    if (!canSave) return
    const defaultAmount = form.defaultAmount
      ? Number(form.defaultAmount)
      : null
    dispatch({
      type: 'UPSERT_CARE_ITEM',
      payload: {
        id: item?.id ?? createId('item'),
        kind: item?.kind ?? kind,
        name: form.name.trim(),
        brand: form.brand.trim(),
        notes: form.notes?.trim?.() ?? form.notes ?? '',
        defaultAmount: Number.isFinite(defaultAmount) ? defaultAmount : null,
        unit: form.unit.trim() || 'unit',
        kcalPerUnit: null,
        productUrl: item?.productUrl ?? '',
      },
    })
    onDone?.()
  }

  function handleDelete() {
    if (!item) return
    dispatch({ type: 'REMOVE_CARE_ITEM', payload: item.id })
    onDone?.()
  }

  return (
    <form className="space-y-3" onSubmit={handleSave}>
      <Field label="Name" htmlFor="catalog-nf-name">
        <input
          id="catalog-nf-name"
          className={fieldClassName}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          autoFocus
        />
      </Field>
      <Field label="Brand (optional)" htmlFor="catalog-nf-brand">
        <input
          id="catalog-nf-brand"
          className={fieldClassName}
          value={form.brand}
          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Default amount" htmlFor="catalog-nf-amt">
          <input
            id="catalog-nf-amt"
            type="number"
            inputMode="decimal"
            className={fieldClassName}
            value={form.defaultAmount}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultAmount: e.target.value }))
            }
          />
        </Field>
        <Field label="Unit" htmlFor="catalog-nf-unit">
          <input
            id="catalog-nf-unit"
            className={fieldClassName}
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="catalog-nf-notes">
        <input
          id="catalog-nf-notes"
          className={fieldClassName}
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </Field>
      <Button type="submit" className="w-full !h-11" disabled={!canSave}>
        {isEdit ? 'Save changes' : `Add ${kindLabel(kind).toLowerCase()}`}
      </Button>
      {isEdit ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full !h-11 text-red-500"
          onClick={handleDelete}
        >
          <Trash2 size={16} />
          Remove from catalog
        </Button>
      ) : null}
    </form>
  )
}

function FoodCreateInCatalog({ initialName = '', onDone }) {
  const { dispatch, createId } = useApp()
  const [form, setForm] = useState(() => emptyCreate('food', initialName))

  function handleSave(e) {
    e.preventDefault()
    if (!foodCreateIsValid(form)) return
    dispatch({
      type: 'UPSERT_CARE_ITEM',
      payload: buildFoodCareItem(form, createId('item')),
    })
    onDone?.()
  }

  return (
    <form className="space-y-3" onSubmit={handleSave}>
      <FoodCreateFields form={form} onChange={setForm} idPrefix="catalog-food" />
      <Button
        type="submit"
        className="w-full !h-11"
        disabled={!foodCreateIsValid(form)}
      >
        Add food
      </Button>
    </form>
  )
}

/** Full care library: Food, Meds, and Supplements. */
export default function CatalogTab() {
  const { catalog, dispatch } = useApp()
  const [kindFilter, setKindFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [createKind, setCreateKind] = useState('food')
  const [editingId, setEditingId] = useState(null)

  const counts = useMemo(() => {
    const all = catalog ?? []
    return {
      all: all.length,
      food: all.filter((i) => i.kind === 'food').length,
      med: all.filter((i) => i.kind === 'med').length,
      supplement: all.filter((i) => i.kind === 'supplement').length,
    }
  }, [catalog])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (catalog ?? [])
      .filter((item) => (kindFilter === 'all' ? true : item.kind === kindFilter))
      .filter((item) => itemMatchesQuery(item, q))
      .sort((a, b) => {
        const kindOrder = { food: 0, med: 1, supplement: 2 }
        const kd = (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9)
        if (kd !== 0) return kd
        return foodListLabel(a).localeCompare(foodListLabel(b), undefined, {
          sensitivity: 'base',
        })
      })
  }, [catalog, kindFilter, query])

  useEffect(() => {
    if ((catalog ?? []).length === 0) setCreating(true)
  }, [catalog])

  function closeCreate() {
    setCreating(false)
    setQuery('')
  }

  const editingItem = (catalog ?? []).find((i) => i.id === editingId) ?? null

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Catalog</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Food, meds, and supplements you reuse in menus and logs.
          </p>
        </div>

        <SegmentedControl
          value={kindFilter}
          onChange={(value) => {
            setKindFilter(value)
            setEditingId(null)
          }}
          options={KIND_FILTERS}
          ariaLabel="Catalog filter"
        />

        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            className={`${fieldClassName} !mt-0 pl-11`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search catalog…"
            autoComplete="off"
            aria-label="Search catalog"
          />
        </div>

        {!creating ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setEditingId(null)
              setCreateKind(kindFilter === 'all' ? 'food' : kindFilter)
              setCreating(true)
            }}
          >
            <Plus size={16} />
            Add to catalog
          </Button>
        ) : null}
      </Card>

      {creating ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800">New item</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Saved here and available for menus and logging.
              </p>
            </div>
            {counts.all > 0 ? (
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
                onClick={closeCreate}
                aria-label="Cancel"
              >
                −
              </button>
            ) : null}
          </div>
          <Field label="Type">
            <SegmentedControl
              value={createKind}
              onChange={setCreateKind}
              options={CREATE_KINDS}
              ariaLabel="New item type"
            />
          </Field>
          {createKind === 'food' ? (
            <FoodCreateInCatalog
              initialName={query.trim()}
              onDone={closeCreate}
            />
          ) : (
            <NonFoodEditor
              kind={createKind}
              initialName={query.trim()}
              onDone={closeCreate}
            />
          )}
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-lg font-bold text-slate-800">
            {kindFilter === 'all'
              ? 'All items'
              : kindFilter === 'food'
                ? 'Foods'
                : kindFilter === 'med'
                  ? 'Meds'
                  : 'Supplements'}
          </h3>
          <p className="text-sm text-slate-500">
            {query.trim()
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
              : `${counts[kindFilter] ?? 0} saved`}
          </p>
        </div>

        {filtered.length === 0 && !creating ? (
          <Card className="text-center">
            <p className="text-sm text-slate-500">
              {query.trim()
                ? `No items match “${query.trim()}”.`
                : kindFilter === 'all'
                  ? 'Your catalog is empty — add food, meds, or supplements.'
                  : `No ${kindLabel(kindFilter).toLowerCase()}s yet.`}
            </p>
            <Button
              className="mt-3 w-full"
              onClick={() => {
                setCreateKind(kindFilter === 'all' ? 'food' : kindFilter)
                setCreating(true)
              }}
            >
              <Plus size={16} />
              Add{' '}
              {kindFilter === 'all'
                ? 'item'
                : kindLabel(kindFilter).toLowerCase()}
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => {
              const isEditing = editingId === item.id
              return (
                <Card as="li" key={item.id} className="space-y-3">
                  {isEditing ? (
                    item.kind === 'food' ? (
                      <FoodItemForm
                        embedded
                        editingFood={item}
                        onDone={() => setEditingId(null)}
                      />
                    ) : (
                      <NonFoodEditor
                        item={item}
                        kind={item.kind}
                        onDone={() => setEditingId(null)}
                      />
                    )
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-2xl text-left"
                        onClick={() => {
                          setCreating(false)
                          setEditingId(item.id)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F59E0B]">
                            {kindLabel(item.kind)}
                          </span>
                          <p className="truncate font-semibold text-slate-800">
                            {item.kind === 'food'
                              ? foodListLabel(item)
                              : item.name}
                          </p>
                        </div>
                        {item.kind === 'food' ? (
                          <>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {[item.brand, getCategoryLabel(item.category)]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {densitySummary(item) || 'No kcal density yet'}
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {[
                              item.brand,
                              item.defaultAmount != null
                                ? `${item.defaultAmount}${item.unit ? ` ${item.unit}` : ''}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Tap to edit'}
                          </p>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        className="!h-10 shrink-0 px-3 text-red-500"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          dispatch({
                            type: 'REMOVE_CARE_ITEM',
                            payload: item.id,
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
