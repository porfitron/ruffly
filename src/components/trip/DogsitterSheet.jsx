import { useEffect, useState } from 'react'
import { ExternalLink, Printer } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useApp } from '../../context/AppContext'
import {
  resolveActiveFeedingPlan,
  resolveMealSessions,
} from '../../utils/calculations'

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

function ContactBlock({ label, name, phone }) {
  if (!name && !phone) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-slate-800">{name || '—'}</p>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="text-sm font-medium text-[#F59E0B] print:text-slate-700"
        >
          {phone}
        </a>
      ) : null}
    </div>
  )
}

function CareSheetDocument({ dog, pantry, mealPlan, preparedOn }) {
  const care = dog.careInfo ?? {}
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

  return (
    <Card className="dogsitter-sheet space-y-5 print:rounded-none print:border print:border-slate-200 print:p-8 print:shadow-none">
      <header className="border-b border-amber-100 pb-4">
        <p className="text-sm font-extrabold tracking-tight text-[#F59E0B]">
          Ruffly
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-800">
          Care sheet for {dog.name}
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
          Feeding schedule
        </h3>
        {feedingPlan.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No bowl plan yet — add foods in the Pantry, then set portions on the
            Bowl tab.
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

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Contacts
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ContactBlock
            label="Owner"
            name={care.ownerName}
            phone={care.ownerPhone}
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
        !care.emergencyName &&
        !care.emergencyPhone &&
        !care.vetName &&
        !care.vetPhone ? (
          <p className="mt-2 text-sm text-slate-500 print:hidden">
            Add contacts above so they appear on the printed sheet.
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

/** P3 — Print-optimized dogsitter care sheet */
export default function DogsitterSheet() {
  const { activeDog, dogs, pantry, mealPlansByDogId, currentMealPlan } =
    useApp()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [printScope, setPrintScope] = useState('active') // 'active' | 'all'
  const [pendingPrint, setPendingPrint] = useState(false)

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dogsForPrint =
    printScope === 'all' && dogs.length > 1
      ? sortDogsByName(dogs)
      : activeDog
        ? [activeDog]
        : []

  useEffect(() => {
    if (!pendingPrint) return
    const id = window.requestAnimationFrame(() => {
      window.print()
      setPendingPrint(false)
      setPrintScope('active')
    })
    return () => window.cancelAnimationFrame(id)
  }, [pendingPrint, printScope])

  if (!activeDog) {
    return (
      <Card className="text-center print:hidden">
        <h2 className="text-xl font-bold text-slate-800">
          Dogsitter care sheet
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a pup profile to generate a printable care guide.
        </p>
      </Card>
    )
  }

  const hasMultipleDogs = dogs.length > 1

  function handleConfirmPrint() {
    setConfirmOpen(false)
    setPendingPrint(true)
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
          Print care sheet
        </Button>
      </div>

      {/* On-screen preview of the active pup */}
      <div className={hasMultipleDogs && printScope === 'all' ? 'print:hidden' : ''}>
        <CareSheetDocument
          dog={activeDog}
          pantry={pantry}
          mealPlan={currentMealPlan}
          preparedOn={today}
        />
      </div>

      {/* Print packet for all dogs (screen-hidden) */}
      {hasMultipleDogs && printScope === 'all' ? (
        <div className="hidden print:block">
          {dogsForPrint.map((dog) => (
            <div key={dog.id} className="dogsitter-print-page">
              <CareSheetDocument
                dog={dog}
                pantry={pantry}
                mealPlan={mealPlansByDogId?.[dog.id] ?? []}
                preparedOn={today}
              />
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Print care sheet?"
        onClose={() => {
          setConfirmOpen(false)
          setPrintScope('active')
        }}
      >
        <p className="text-sm text-slate-500">
          Choose whose care sheet to send to the printer.
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
            Print
          </Button>
        </div>
      </Modal>
    </div>
  )
}
