import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Printer } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useApp } from '../../context/AppContext'
import {
  resolveActiveFeedingPlan,
  resolveMealSessions,
} from '../../utils/calculations'
import {
  formatSlotLabel,
  groupTodayTasks,
  kindLabel,
} from '../../utils/todayCare'

function formatMealParts(servings, meal) {
  const parts = []
  const grams = servings?.[meal.gramsKey]
  const cups = servings?.[meal.cupsKey]
  const cans = servings?.[meal.cansKey]
  if (grams) parts.push(`${grams} g`)
  if (cups) parts.push(`${cups} cups`)
  if (cans) parts.push(`${cans} cans`)
  return parts.length ? parts.join(' · ') : '—'
}

function formatDailyParts(servings) {
  const parts = []
  if (servings.grams) parts.push(`${servings.grams} g`)
  if (servings.cups) parts.push(`${servings.cups} cups`)
  if (servings.cans) parts.push(`${servings.cans} cans`)
  return parts.length ? parts.join(' · ') : '—'
}

function isTreat(item) {
  return item.food?.category === 'treat'
}

function ContactBlock({ label, name, phone, email }) {
  if (!name && !phone && !email) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-slate-800">{name || '—'}</p>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="block text-sm font-medium text-[#F59E0B] print:text-slate-700"
        >
          {phone}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="block text-sm font-medium text-[#F59E0B] print:text-slate-700"
        >
          {email}
        </a>
      ) : null}
    </div>
  )
}

function menuRowsForDog(catalog, menu) {
  const byId = new Map((catalog ?? []).map((item) => [item.id, item]))
  return (menu ?? [])
    .map((item) => {
      const careItem = byId.get(item.careItemId)
      if (!careItem) return null
      const amount = item.amount ?? careItem.defaultAmount
      const unit = item.unit ?? careItem.unit
      return {
        id: item.id,
        kind: careItem.kind,
        name: careItem.formula || careItem.name,
        brand: careItem.brand,
        flavor: careItem.flavor,
        slot: item.slot ?? 'daily',
        amount,
        unit,
        productUrl: careItem.productUrl,
      }
    })
    .filter(Boolean)
}

/** Slot sections in Today order, so Daily can sit around Breakfast / Evening. */
function groupMenuBySlot(rows, todayRowOrder) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const tasks = rows.map((row) => ({
    id: row.id,
    dogId: 'guide',
    menuItemId: row.id,
    slot: row.slot,
    kind: row.kind,
    name: row.name,
    oneTime: false,
  }))

  const groups = []
  for (const row of groupTodayTasks(tasks, todayRowOrder)) {
    if (row.type === 'meal') {
      groups.push({
        id: row.id,
        slot: row.slot,
        label: row.slotLabel,
        items: row.items
          .map((task) => byId.get(task.menuItemId))
          .filter(Boolean),
      })
      continue
    }

    const item = byId.get(row.task.menuItemId)
    if (!item) continue
    const slot = item.slot ?? 'daily'
    const prev = groups[groups.length - 1]
    if (prev && prev.slot === slot && prev.kind === 'item') {
      prev.items.push(item)
      continue
    }
    groups.push({
      id: row.id,
      kind: 'item',
      slot,
      label: formatSlotLabel(slot),
      items: [item],
    })
  }

  return groups.filter((group) => group.items.length > 0)
}

function formatMenuAmount(amount, unit) {
  if (amount == null || amount === '') return ''
  return `${amount}${unit ? ` ${unit}` : ''}`
}

function ProfileDetails({ dog, catalog }) {
  const medNeeds = (dog.medicationNeedIds ?? [])
    .map((id) => (catalog ?? []).find((item) => item.id === id))
    .filter(Boolean)
  const fields = [
    dog.behaviorNotes?.trim()
      ? { label: 'Behavior', value: dog.behaviorNotes.trim() }
      : null,
    dog.licenseNumber?.trim()
      ? { label: 'License', value: dog.licenseNumber.trim() }
      : null,
    dog.vaccineInfo?.trim()
      ? { label: 'Vaccines', value: dog.vaccineInfo.trim() }
      : null,
    dog.microchipId?.trim()
      ? { label: 'Microchip', value: dog.microchipId.trim() }
      : null,
    medNeeds.length > 0
      ? {
          label: 'Medication needs',
          value: medNeeds.map((item) => item.name).join(', '),
        }
      : null,
  ].filter(Boolean)

  if (fields.length === 0) return null

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
        About {dog.name}
      </h3>
      <dl className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {field.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function CareSheetDocument({
  dog,
  pantry,
  mealPlan,
  catalog,
  menu,
  preparedOn,
}) {
  const care = dog.careInfo ?? {}
  const menuRows = menuRowsForDog(catalog, menu)
  const menuGroups = groupMenuBySlot(menuRows, dog.todayRowOrder)
  const feedingPlan = resolveActiveFeedingPlan(dog, pantry, mealPlan)
  const mealFoods = feedingPlan.filter((item) => !isTreat(item))
  const treatFoods = feedingPlan.filter(isTreat)
  const mealSessions = resolveMealSessions(dog.mealsPerDay).map((meal) => ({
    ...meal,
    totalGrams: mealFoods.reduce(
      (sum, item) => sum + (Number(item.servings[meal.gramsKey]) || 0),
      0,
    ),
  }))
  const treatTotalGrams = treatFoods.reduce(
    (sum, item) => sum + (Number(item.servings.grams) || 0),
    0,
  )
  const reorderItems = [
    ...menuRows.filter((row) => row.productUrl),
    ...feedingPlan
      .filter((item) => item.food.productUrl)
      .filter(
        (item) => !menuRows.some((row) => row.productUrl === item.food.productUrl),
      )
      .map((item) => ({
        id: `reorder-${item.food.id}`,
        name: item.food.name,
        productUrl: item.food.productUrl,
      })),
  ]

  return (
    <Card className="dogsitter-sheet space-y-5 print:rounded-none print:border print:border-slate-200 print:p-8 print:shadow-none">
      <header className="border-b border-amber-100 pb-4">
        <p className="text-sm font-extrabold tracking-tight text-[#F59E0B]">
          Ruffly
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-800">
          Care Guide for {dog.name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">Prepared {preparedOn}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FBF9F5] p-4 print:bg-slate-50">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Weight
          </p>
          <p className="font-bold text-slate-800">
            {dog.weight} {dog.weightUnit}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Daily calories
          </p>
          <p className="font-bold text-[#10B981]">{dog.targetDER} kcal</p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          {menuRows.length > 0 ? 'Daily care' : 'Feeding schedule'}
        </h3>
        {menuRows.length > 0 ? (
          <div className="mt-3 space-y-3">
            {menuGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-amber-100 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.items.map((item) => {
                    const amountLabel = formatMenuAmount(item.amount, item.unit)
                    const subtitle = [kindLabel(item.kind), item.brand, item.flavor]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl bg-[#FBF9F5] px-3 py-2 print:bg-slate-50"
                      >
                        <p className="font-bold text-slate-800">{item.name}</p>
                        {subtitle ? (
                          <p className="text-xs text-slate-500">{subtitle}</p>
                        ) : null}
                        {amountLabel ? (
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {amountLabel}
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {reorderItems.length > 0 ? (
              <ul className="space-y-2">
                {reorderItems.map((item) => (
                  <li key={`reorder-${item.id}`}>
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] print:text-slate-700"
                    >
                      Reorder {item.name}
                      <ExternalLink size={12} />
                    </a>
                    <p className="break-all text-xs text-slate-400 print:block">
                      {item.productUrl}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : feedingPlan.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No daily menu yet — add foods, meds, or supplements on Pack, then
            they will print here.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {mealFoods.length > 0
              ? mealSessions.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-2xl border border-amber-100 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {meal.label}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {mealFoods.map((item) => (
                        <li
                          key={`${meal.id}-${item.food.id}`}
                          className="rounded-xl bg-[#FBF9F5] px-3 py-2 print:bg-slate-50"
                        >
                          <p className="font-bold text-slate-800">
                            {item.food.name}
                          </p>
                          {item.food.brand ? (
                            <p className="text-xs text-slate-500">
                              {item.food.brand}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {formatMealParts(item.servings, meal)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {meal.totalGrams > 0 ? (
                      <p className="mt-2 text-right text-sm font-bold text-slate-800">
                        Total: {meal.totalGrams} g
                      </p>
                    ) : null}
                  </div>
                ))
              : null}
            {treatFoods.length > 0 ? (
              <div className="rounded-2xl border border-amber-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Daily Treats
                </p>
                <ul className="mt-2 space-y-2">
                  {treatFoods.map((item) => (
                    <li
                      key={`treat-${item.food.id}`}
                      className="rounded-xl bg-[#FBF9F5] px-3 py-2 print:bg-slate-50"
                    >
                      <p className="font-bold text-slate-800">
                        {item.food.name}
                      </p>
                      {item.food.brand ? (
                        <p className="text-xs text-slate-500">
                          {item.food.brand}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {formatDailyParts(item.servings)}
                      </p>
                    </li>
                  ))}
                </ul>
                {treatTotalGrams > 0 ? (
                  <p className="mt-2 text-right text-sm font-bold text-slate-800">
                    Total: {treatTotalGrams} g
                  </p>
                ) : null}
              </div>
            ) : null}
            {feedingPlan.some((item) => item.food.productUrl) ? (
              <ul className="space-y-2">
                {feedingPlan
                  .filter((item) => item.food.productUrl)
                  .map((item) => (
                    <li key={`reorder-${item.food.id}`}>
                      <a
                        href={item.food.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] print:text-slate-700"
                      >
                        Reorder {item.food.name}
                        <ExternalLink size={12} />
                      </a>
                      <p className="break-all text-xs text-slate-400 print:block">
                        {item.food.productUrl}
                      </p>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <ProfileDetails dog={dog} catalog={catalog} />

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Contacts
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ContactBlock
            label="Owner"
            name={care.ownerName}
            phone={care.ownerPhone}
            email={care.ownerEmail}
          />
          <ContactBlock
            label="Emergency"
            name={care.emergencyName}
            phone={care.emergencyPhone}
          />
          <ContactBlock
            label="Veterinarian"
            name={care.vetName}
            phone={care.vetPhone}
          />
        </div>
        {!care.ownerName &&
        !care.ownerPhone &&
        !care.ownerEmail &&
        !care.emergencyName &&
        !care.emergencyPhone &&
        !care.vetName &&
        !care.vetPhone ? (
          <p className="mt-2 text-sm text-slate-500 print:hidden">
            Add contacts above so they appear on the printed care guide.
          </p>
        ) : null}
      </section>

      {care.notes ? (
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Notes
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {care.notes}
          </p>
        </section>
      ) : null}

      <footer className="border-t border-amber-100 pt-3 text-xs text-slate-400">
        Generated with Ruffly · Portions based on veterinary RER/DER estimates —
        confirm with your vet.
      </footer>
    </Card>
  )
}

function sortDogsByName(dogs) {
  return [...dogs].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

/** Print-optimized care guide for sitters */
export default function DogsitterSheet() {
  const {
    activeDog,
    dogs,
    pantry,
    catalog,
    mealPlansByDogId,
    menusByDogId,
    currentMealPlan,
    currentMenu,
  } = useApp()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [printScope, setPrintScope] = useState('active') // 'active' | 'all'
  const printTitleRef = useRef(null)
  const allowClearAtRef = useRef(0)

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const hasMultipleDogs = dogs.length > 1
  const dogsForPrint = hasMultipleDogs ? sortDogsByName(dogs) : []

  useEffect(() => {
    function clearPrintAttr() {
      document.documentElement.removeAttribute('data-print-dogs')
      if (printTitleRef.current != null) {
        document.title = printTitleRef.current
        printTitleRef.current = null
      }
    }

    function maybeClear() {
      // Chrome fires afterprint / a focus blip when the preview opens, before
      // it snapshots. Ignore those so the pack packet stays in the PDF.
      if (Date.now() < allowClearAtRef.current) return
      clearPrintAttr()
    }

    window.addEventListener('afterprint', maybeClear)
    window.addEventListener('focus', maybeClear)

    return () => {
      window.removeEventListener('afterprint', maybeClear)
      window.removeEventListener('focus', maybeClear)
      clearPrintAttr()
    }
  }, [])

  if (!activeDog) {
    return (
      <Card className="text-center print:hidden">
        <h2 className="text-xl font-bold text-slate-800">Care Guide</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a pup profile to generate a printable care guide.
        </p>
      </Card>
    )
  }

  function handleConfirmPrint() {
    const scope = printScope === 'all' && hasMultipleDogs ? 'all' : 'active'
    setConfirmOpen(false)
    setPrintScope('active')
    // Set synchronously on the DOM (not React state) so Safari/iOS — where
    // window.print() returns immediately — still has every sheet visible to
    // the print capture. Cleared on afterprint only (not print media-query).
    if (printTitleRef.current == null) {
      printTitleRef.current = document.title
    }
    document.title =
      scope === 'all'
        ? 'Care Guide — Pack'
        : `Care Guide — ${activeDog.name}`
    document.documentElement.setAttribute('data-print-dogs', scope)
    allowClearAtRef.current = Date.now() + 750
    // Two frames: let the confirm modal unmount, then snapshot.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print()
      })
    })
  }

  return (
    <div className="space-y-3">
      <div className="print:hidden flex gap-2">
        <Button
          className="w-full"
          onClick={() => {
            setPrintScope('active')
            setConfirmOpen(true)
          }}
        >
          <Printer size={18} />
          Print / Save PDF
        </Button>
      </div>

      {/* On-screen preview of the active pup; hidden when printing all */}
      <div className="dogsitter-active-preview">
        <CareSheetDocument
          dog={activeDog}
          pantry={pantry}
          mealPlan={currentMealPlan}
          catalog={catalog}
          menu={currentMenu}
          preparedOn={today}
        />
      </div>

      {/* Always mounted when multi-dog so print never races a React commit */}
      {hasMultipleDogs ? (
        <div className="dogsitter-all-packet hidden">
          {dogsForPrint.map((dog) => (
            <div key={dog.id} className="dogsitter-print-page">
              <CareSheetDocument
                dog={dog}
                pantry={pantry}
                mealPlan={mealPlansByDogId?.[dog.id] ?? []}
                catalog={catalog}
                menu={menusByDogId?.[dog.id] ?? []}
                preparedOn={today}
              />
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Print Care Guide?"
        onClose={() => {
          setConfirmOpen(false)
          setPrintScope('active')
        }}
      >
        <p className="text-sm text-slate-500">
          Choose whose care guide to print or save as PDF.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Print scope</legend>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
              printScope === 'active'
                ? 'border-[#F59E0B] bg-amber-50'
                : 'border-amber-100 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="print-scope"
              className="mt-1 accent-[#F59E0B]"
              checked={printScope === 'active'}
              onChange={() => setPrintScope('active')}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Just {activeDog.name}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                One sheet for the active pup
              </span>
            </span>
          </label>

          {hasMultipleDogs ? (
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                printScope === 'all'
                  ? 'border-[#F59E0B] bg-amber-50'
                  : 'border-amber-100 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="print-scope"
                className="mt-1 accent-[#F59E0B]"
                checked={printScope === 'all'}
                onChange={() => setPrintScope('all')}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  All dogs ({dogs.length})
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  One page per pup, A–Z by name
                </span>
              </span>
            </label>
          ) : null}
        </fieldset>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setConfirmOpen(false)
              setPrintScope('active')
            }}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleConfirmPrint}>
            <Printer size={16} />
            Print PDF
          </Button>
        </div>
      </Modal>
    </div>
  )
}
