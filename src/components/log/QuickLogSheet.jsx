import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, SegmentedControl, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { estimateFoodKcal, kindLabel } from '../../utils/todayCare'
import FoodCreateFields, {
  emptyCreate,
  foodCreateIsValid,
  buildFoodCareItem,
  foodListLabel,
} from '../catalog/FoodCreateFields'

const KIND_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'med', label: 'Med' },
  { value: 'supplement', label: 'Supp' },
  { value: 'weight', label: 'Weight' },
]

const SLOT_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'evening', label: 'Evening' },
  { value: 'daily', label: 'Daily' },
  { value: 'as_needed', label: 'As needed' },
]

/** Quick log sheet — pick or create catalog item, then ADD_LOG. */
export default function QuickLogSheet({
  open,
  onClose,
  initialDogId = null,
  initialKind = 'food',
}) {
  const { dogs, activeDogId, catalog, dispatch, createId } = useApp()
  const [dogId, setDogId] = useState(initialDogId || activeDogId || dogs[0]?.id)
  const [kind, setKind] = useState(initialKind)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(() => emptyCreate(initialKind))

  const dog = dogs.find((d) => d.id === dogId) ?? dogs[0]

  useEffect(() => {
    if (!open) return
    setDogId(initialDogId || activeDogId || dogs[0]?.id)
    setKind(initialKind)
    setQuery('')
    setSelectedId(null)
    setAmount('')
    setUnit(initialKind === 'weight' ? 'lbs' : '')
    setNote('')
    setCreating(false)
    setCreateForm(emptyCreate(initialKind))
    // Only reset when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const candidates = useMemo(() => {
    if (kind === 'weight') return []
    const q = query.trim().toLowerCase()
    return (catalog ?? [])
      .filter((item) => item.kind === kind)
      .filter((item) => {
        if (!q) return true
        const hay = [
          item.name,
          item.formula,
          item.brand,
          item.flavor,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 12)
  }, [catalog, kind, query])

  const selected = (catalog ?? []).find((c) => c.id === selectedId) ?? null

  function pickItem(item) {
    setSelectedId(item.id)
    setCreating(false)
    setAmount(
      item.defaultAmount != null && item.defaultAmount !== ''
        ? String(item.defaultAmount)
        : '',
    )
    setUnit(item.unit ?? '')
  }

  function handleKindChange(next) {
    setKind(next)
    setSelectedId(null)
    setCreating(false)
    setQuery('')
    setCreateForm(emptyCreate(next))
    setAmount('')
    setUnit(next === 'weight' ? (dog?.weightUnit ?? 'lbs') : '')
    if (next === 'weight' && dog?.weight) {
      setAmount(String(dog.weight))
    }
  }

  function handleSave() {
    if (!dog) return

    if (kind === 'weight') {
      const weight = Number(amount)
      if (!Number.isFinite(weight) || weight <= 0) return
      dispatch({
        type: 'ADD_LOG',
        payload: {
          dogId: dog.id,
          careItemId: null,
          kind: 'weight',
          amount: weight,
          unit: unit || dog.weightUnit || 'lbs',
          kcal: null,
          note: note.trim(),
        },
      })
      // Keep dog profile weight in sync
      dispatch({
        type: 'UPSERT_DOG',
        payload: {
          ...dog,
          weight,
          weightUnit: unit || dog.weightUnit || 'lbs',
        },
      })
      onClose?.()
      return
    }

    let careItem = selected
    if (creating) {
      if (kind === 'food') {
        if (!foodCreateIsValid(createForm)) return
        careItem = buildFoodCareItem(createForm, createId('item'))
      } else {
        const name = createForm.name.trim()
        if (!name) return
        const defaultAmount = createForm.defaultAmount
          ? Number(createForm.defaultAmount)
          : null
        careItem = {
          id: createId('item'),
          kind,
          name,
          brand: createForm.brand.trim(),
          notes: '',
          defaultAmount: Number.isFinite(defaultAmount) ? defaultAmount : null,
          unit: createForm.unit.trim() || 'unit',
          kcalPerUnit: null,
          productUrl: '',
        }
      }
      dispatch({ type: 'UPSERT_CARE_ITEM', payload: careItem })
    }

    if (!careItem) return

    const qty =
      amount !== ''
        ? Number(amount)
        : careItem.defaultAmount
    const logUnit = unit || careItem.unit || ''
    const kcal =
      kind === 'food' ? estimateFoodKcal(careItem, qty) : null

    dispatch({
      type: 'ADD_LOG',
      payload: {
        dogId: dog.id,
        careItemId: careItem.id,
        kind,
        amount: Number.isFinite(Number(qty)) ? Number(qty) : null,
        unit: logUnit,
        kcal,
        note: note.trim(),
      },
    })
    onClose?.()
  }

  const canSave =
    Boolean(dog) &&
    (kind === 'weight'
      ? Number(amount) > 0
      : creating
        ? kind === 'food'
          ? foodCreateIsValid(createForm)
          : Boolean(createForm.name?.trim())
        : Boolean(selected))

  return (
    <Modal open={open} title="Log care" onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        {dogs.length > 1 ? (
          <Field label="Dog">
            <select
              className={fieldClassName}
              value={dog?.id ?? ''}
              onChange={(e) => setDogId(e.target.value)}
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="What happened?">
          <SegmentedControl
            value={kind}
            onChange={handleKindChange}
            options={KIND_OPTIONS}
            ariaLabel="Log type"
          />
        </Field>

        {kind !== 'weight' ? (
          <>
            {!creating ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className={`${fieldClassName} !mt-0 pl-10`}
                    placeholder={`Search ${kindLabel(kind).toLowerCase()}s…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search catalog"
                  />
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {candidates.map((item) => {
                    const active = item.id === selectedId
                    const label =
                      item.kind === 'food' ? foodListLabel(item) : item.name
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => pickItem(item)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                            active
                              ? 'bg-amber-50 font-semibold text-[#F59E0B] ring-1 ring-amber-200'
                              : 'bg-[#FBF9F5] text-slate-700 hover:bg-amber-50/80'
                          }`}
                        >
                          <span className="truncate">{label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <Button
                  variant="secondary"
                  className="w-full !h-11"
                  onClick={() => {
                    setCreating(true)
                    setSelectedId(null)
                    setCreateForm(emptyCreate(kind, query.trim()))
                  }}
                >
                  <Plus size={16} />
                  Create new {kindLabel(kind).toLowerCase()}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-amber-100 bg-[#FBF9F5] p-3">
                {kind === 'food' ? (
                  <FoodCreateFields
                    form={createForm}
                    onChange={setCreateForm}
                    idPrefix="ql-food"
                    showServing={false}
                  />
                ) : (
                  <>
                    <Field label="Name" htmlFor="ql-name">
                      <input
                        id="ql-name"
                        className={fieldClassName}
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, name: e.target.value }))
                        }
                        autoFocus
                      />
                    </Field>
                    <Field label="Brand (optional)" htmlFor="ql-brand">
                      <input
                        id="ql-brand"
                        className={fieldClassName}
                        value={createForm.brand}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, brand: e.target.value }))
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Default amount" htmlFor="ql-amt">
                        <input
                          id="ql-amt"
                          type="number"
                          inputMode="decimal"
                          className={fieldClassName}
                          value={createForm.defaultAmount}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              defaultAmount: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Unit" htmlFor="ql-unit">
                        <input
                          id="ql-unit"
                          className={fieldClassName}
                          value={createForm.unit}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, unit: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                  </>
                )}
                <Button
                  variant="ghost"
                  className="!h-10 w-full"
                  onClick={() => setCreating(false)}
                >
                  Back to search
                </Button>
              </div>
            )}
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Field
            label={kind === 'weight' ? 'Weight' : 'Amount'}
            htmlFor="ql-log-amt"
          >
            <input
              id="ql-log-amt"
              type="number"
              inputMode="decimal"
              className={fieldClassName}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selected?.defaultAmount?.toString() ?? ''}
            />
          </Field>
          <Field label="Unit" htmlFor="ql-log-unit">
            <input
              id="ql-log-unit"
              className={fieldClassName}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={
                kind === 'weight' ? dog?.weightUnit || 'lbs' : selected?.unit || ''
              }
            />
          </Field>
        </div>

        <Field label="Note (optional)" htmlFor="ql-note">
          <input
            id="ql-note"
            className={fieldClassName}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={!canSave} onClick={handleSave}>
          Save log
        </Button>
      </div>
    </Modal>
  )
}

/** Lightweight menu editor for a dog’s daily routine. */
export function MenuEditorSheet({ open, dogId, onClose, onDogChange }) {
  const { dogs, catalog, menusByDogId, dispatch, createId, activeDogId } =
    useApp()
  const [selectedDogId, setSelectedDogId] = useState(
    dogId || activeDogId || dogs[0]?.id || null,
  )
  const dog = dogs.find((d) => d.id === selectedDogId) ?? dogs[0] ?? null
  const effectiveDogId = dog?.id ?? null
  const menu = menusByDogId?.[effectiveDogId] ?? []
  const [pickKind, setPickKind] = useState('food')
  const [slot, setSlot] = useState('breakfast')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(() => emptyCreate('food'))

  const kindCatalog = useMemo(
    () => (catalog ?? []).filter((item) => item.kind === pickKind),
    [catalog, pickKind],
  )
  const catalogEmpty = kindCatalog.length === 0

  useEffect(() => {
    if (!open) return
    // Prefer the dog this sheet was opened for; fall back to active / first.
    setSelectedDogId(dogId || activeDogId || dogs[0]?.id || null)
    setPickKind('food')
    setSlot('breakfast')
    setQuery('')
    setCreating(false)
    setCreateForm(emptyCreate('food'))
    // Intentionally not depending on activeDogId/dogs — picker owns selection while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dogId])

  // Empty catalog for this kind → jump straight into create
  useEffect(() => {
    if (!open) return
    if (catalogEmpty) {
      setCreating(true)
      setCreateForm(emptyCreate(pickKind, query.trim()))
    }
  }, [open, catalogEmpty, pickKind])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Only hide items already on this slot — same food can be breakfast + evening.
    const usedInSlot = new Set(
      menu
        .filter((m) => (m.slot ?? 'daily') === slot)
        .map((m) => m.careItemId),
    )
    return kindCatalog
      .filter((item) => !usedInSlot.has(item.id))
      .filter((item) => {
        if (!q) return true
        const hay = [item.name, item.formula, item.brand, item.flavor]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 10)
  }, [kindCatalog, query, menu, slot])

  function selectDog(nextId) {
    setSelectedDogId(nextId)
    onDogChange?.(nextId)
    dispatch({ type: 'SET_ACTIVE_DOG', payload: nextId })
    setQuery('')
    setCreating(false)
    setCreateForm(emptyCreate(pickKind))
  }

  function handleSlotChange(next) {
    setSlot(next)
    setQuery('')
    // Show the pick list for the new slot (unless catalog is empty).
    if (!catalogEmpty) setCreating(false)
  }

  function startCreate(seedName = '') {
    setCreating(true)
    setCreateForm(emptyCreate(pickKind, seedName || query.trim()))
  }

  function handleKindChange(next) {
    setPickKind(next)
    setQuery('')
    setCreating(false)
    setCreateForm(emptyCreate(next))
  }

  function parseAmount(value) {
    const raw = String(value ?? '').trim()
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  function setMenuItems(items) {
    if (!effectiveDogId) return
    dispatch({
      type: 'SET_DOG_MENU',
      payload: { dogId: effectiveDogId, items },
    })
  }

  function addItem(careItem, amountOverride) {
    if (!effectiveDogId) return
    const amount =
      amountOverride != null && amountOverride !== ''
        ? Number(amountOverride)
        : careItem.defaultAmount
    const unit =
      careItem.unit || (careItem.kind === 'food' ? 'g' : null)
    setMenuItems([
      ...menu,
      {
        id: createId('menu'),
        careItemId: careItem.id,
        slot,
        amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
        unit,
      },
    ])
    setQuery('')
    setCreating(false)
    setCreateForm(emptyCreate(pickKind))
  }

  function updateItem(menuItemId, patch) {
    setMenuItems(
      menu.map((item) =>
        item.id === menuItemId ? { ...item, ...patch } : item,
      ),
    )
  }

  function commitAmount(menuItem, raw, careKind) {
    const amount = parseAmount(raw)
    const patch = { amount }
    if (!menuItem.unit && careKind === 'food') patch.unit = 'g'
    if (menuItem.amount === amount && patch.unit == null) return
    updateItem(menuItem.id, patch)
  }

  function createAndAdd() {
    if (!effectiveDogId) return
    let careItem
    if (pickKind === 'food') {
      if (!foodCreateIsValid(createForm)) return
      careItem = buildFoodCareItem(createForm, createId('item'))
    } else {
      const name = createForm.name.trim()
      if (!name) return
      const defaultAmount = createForm.defaultAmount
        ? Number(createForm.defaultAmount)
        : null
      careItem = {
        id: createId('item'),
        kind: pickKind,
        name,
        brand: createForm.brand.trim(),
        notes: '',
        defaultAmount: Number.isFinite(defaultAmount) ? defaultAmount : null,
        unit: createForm.unit.trim() || 'unit',
        kcalPerUnit: null,
        productUrl: '',
      }
    }
    dispatch({ type: 'UPSERT_CARE_ITEM', payload: careItem })
    addItem(careItem, createForm.defaultAmount)
  }

  function removeItem(menuItemId) {
    setMenuItems(menu.filter((item) => item.id !== menuItemId))
  }

  if (!open) return null

  if (dogs.length === 0) {
    return (
      <Modal open={open} title="Set up a menu" onClose={onClose}>
        <p className="text-sm text-slate-500">
          Add a dog first, then you can build their daily menu.
        </p>
        <Button className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </Modal>
    )
  }

  if (!dog) return null

  const kindName = kindLabel(pickKind).toLowerCase()
  const canCreate =
    pickKind === 'food'
      ? foodCreateIsValid(createForm)
      : Boolean(createForm.name?.trim())

  return (
    <Modal open={open} title="Daily menu" onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        {dogs.length > 1 ? (
          <Field label="Whose menu?">
            <select
              className={fieldClassName}
              value={dog.id}
              onChange={(e) => selectDog(e.target.value)}
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name?.trim() || 'Unnamed'}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm font-semibold text-slate-800">
            {dog.name}&apos;s menu
          </p>
        )}

        <p className="text-sm text-slate-500">
          Planned care for Today. Set grams (or other amounts) on each item.
        </p>

        {menu.length === 0 ? (
          <p className="rounded-2xl bg-[#FBF9F5] px-3 py-3 text-sm text-slate-500">
            Start with breakfast food for {dog.name}, then add meds or
            supplements as needed.
          </p>
        ) : (
          <ul className="space-y-2">
            {menu.map((item) => {
              const care = (catalog ?? []).find((c) => c.id === item.careItemId)
              const kind = care?.kind ?? 'food'
              const title =
                kind === 'food'
                  ? foodListLabel(care)
                  : (care?.name ?? 'Unknown item')
              const unit = item.unit || (kind === 'food' ? 'g' : '')
              const amountLabel =
                kind === 'food' && (!unit || unit === 'g') ? 'Grams' : 'Amount'
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-amber-100 bg-[#FBF9F5] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {kindLabel(kind)} · {item.slot}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="!h-10 shrink-0 px-3 text-red-500"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_5.5rem] gap-2">
                    <Field
                      label={amountLabel}
                      htmlFor={`menu-amt-${item.id}`}
                    >
                      <input
                        id={`menu-amt-${item.id}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className={fieldClassName}
                        defaultValue={item.amount ?? ''}
                        placeholder={
                          care?.defaultAmount != null
                            ? String(care.defaultAmount)
                            : kind === 'food'
                              ? '200'
                              : '1'
                        }
                        onBlur={(e) => commitAmount(item, e.target.value, kind)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        aria-label={`${amountLabel} for ${title}`}
                      />
                    </Field>
                    <Field label="Unit" htmlFor={`menu-unit-${item.id}`}>
                      <input
                        id={`menu-unit-${item.id}`}
                        className={fieldClassName}
                        value={item.unit ?? ''}
                        placeholder={kind === 'food' ? 'g' : care?.unit || ''}
                        onChange={(e) =>
                          updateItem(item.id, { unit: e.target.value })
                        }
                        onBlur={(e) => {
                          const next =
                            e.target.value.trim() ||
                            (kind === 'food' ? 'g' : null)
                          if (next !== item.unit) {
                            updateItem(item.id, { unit: next })
                          }
                        }}
                        aria-label={`Unit for ${title}`}
                      />
                    </Field>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Field label="Add to menu">
          <SegmentedControl
            value={pickKind}
            onChange={handleKindChange}
            options={[
              { value: 'food', label: 'Food' },
              { value: 'med', label: 'Med' },
              { value: 'supplement', label: 'Supp' },
            ]}
            ariaLabel="Item kind"
          />
        </Field>
        <Field label="When">
          <SegmentedControl
            value={slot}
            onChange={handleSlotChange}
            options={SLOT_OPTIONS}
            ariaLabel="Menu slot"
          />
        </Field>

        {creating ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {catalogEmpty
                  ? `Add your first ${kindName}`
                  : `New ${kindName}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {pickKind === 'food'
                  ? 'Brand, formula, flavor, and calories from the label.'
                  : `Saves to your catalog and adds it to ${dog.name}'s menu.`}
              </p>
            </div>
            {pickKind === 'food' ? (
              <FoodCreateFields
                form={createForm}
                onChange={setCreateForm}
                idPrefix="menu-food"
              />
            ) : (
              <>
                <Field label="Name" htmlFor="menu-create-name">
                  <input
                    id="menu-create-name"
                    className={fieldClassName}
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, name: e.target.value }))
                    }
                    autoFocus
                  />
                </Field>
                <Field label="Brand (optional)" htmlFor="menu-create-brand">
                  <input
                    id="menu-create-brand"
                    className={fieldClassName}
                    value={createForm.brand}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, brand: e.target.value }))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Amount" htmlFor="menu-create-amt">
                    <input
                      id="menu-create-amt"
                      type="number"
                      inputMode="decimal"
                      className={fieldClassName}
                      value={createForm.defaultAmount}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          defaultAmount: e.target.value,
                        }))
                      }
                      placeholder="1"
                    />
                  </Field>
                  <Field label="Unit" htmlFor="menu-create-unit">
                    <input
                      id="menu-create-unit"
                      className={fieldClassName}
                      value={createForm.unit}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, unit: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </>
            )}
            <div className="flex gap-2">
              {!catalogEmpty ? (
                <Button
                  variant="ghost"
                  className="!h-11 flex-1"
                  onClick={() => {
                    setCreating(false)
                    setCreateForm(emptyCreate(pickKind))
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                className="!h-11 flex-1"
                disabled={!canCreate}
                onClick={createAndAdd}
              >
                <Plus size={16} />
                Add to menu
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={`${fieldClassName} !mt-0 pl-10`}
                placeholder={`Search ${kindName}s…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`Search ${kindName}s`}
              />
            </div>
            <ul className="space-y-1">
              {candidates.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#FBF9F5] px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-amber-50"
                  >
                    <span className="truncate">
                      {item.kind === 'food' ? foodListLabel(item) : item.name}
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-1 text-xs font-semibold text-[#F59E0B]">
                      <Plus size={14} />
                      {slot === 'as_needed' ? 'Add' : slot}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {candidates.length === 0 && !query.trim() ? (
              <p className="px-1 text-xs text-slate-400">
                Every saved {kindName} is already on {slot.replace('_', ' ')}.
                Create a new one below, or pick another slot.
              </p>
            ) : null}
            {candidates.length === 0 && query.trim() ? (
              <button
                type="button"
                onClick={() => startCreate(query.trim())}
                className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 px-3 py-3 text-left text-sm font-semibold text-[#F59E0B]"
              >
                <Plus size={16} />
                Create “{query.trim()}” and add
              </button>
            ) : (
              <Button
                variant="secondary"
                className="w-full !h-11"
                onClick={() => startCreate()}
              >
                <Plus size={16} />
                New {kindName} for {slot.replace('_', ' ')}
              </Button>
            )}
          </div>
        )}
      </div>

      <Button className="mt-4 w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  )
}
