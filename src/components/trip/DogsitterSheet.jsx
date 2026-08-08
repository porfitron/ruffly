import { ExternalLink, Printer } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { resolveActiveFeedingPlan } from '../../utils/calculations'

function formatMealParts(servings, which) {
  const parts = []
  if (which === 'breakfast') {
    if (servings.breakfastGrams) parts.push(`${servings.breakfastGrams} g`)
    if (servings.breakfastCups) parts.push(`${servings.breakfastCups} cups`)
    if (servings.breakfastCans) parts.push(`${servings.breakfastCans} cans`)
  } else {
    if (servings.dinnerGrams) parts.push(`${servings.dinnerGrams} g`)
    if (servings.dinnerCups) parts.push(`${servings.dinnerCups} cups`)
    if (servings.dinnerCans) parts.push(`${servings.dinnerCans} cans`)
  }
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

/** P3 — Print-optimized dogsitter care sheet */
export default function DogsitterSheet() {
  const { activeDog, pantry, currentMealPlan } = useApp()

  if (!activeDog) {
    return (
      <Card className="text-center print:hidden">
        <h2 className="text-xl font-bold text-slate-800">Dogsitter care sheet</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a pup profile to generate a printable care guide.
        </p>
      </Card>
    )
  }

  const care = activeDog.careInfo ?? {}
  const feedingPlan = resolveActiveFeedingPlan(
    activeDog,
    pantry,
    currentMealPlan,
  )
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const mealFoods = feedingPlan.filter((item) => !isTreat(item))
  const treatFoods = feedingPlan.filter(isTreat)
  const mealSessions = [
    { label: 'Morning', which: 'breakfast', gramsKey: 'breakfastGrams' },
    { label: 'Evening', which: 'dinner', gramsKey: 'dinnerGrams' },
  ].map((meal) => ({
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
    <div className="space-y-3">
      <div className="print:hidden flex gap-2">
        <Button className="w-full" onClick={() => window.print()}>
          <Printer size={18} />
          Print care sheet
        </Button>
      </div>

      <Card
        className="dogsitter-sheet space-y-5 print:rounded-none print:border print:border-slate-200 print:p-8 print:shadow-none"
      >
        <header className="border-b border-amber-100 pb-4">
          <p className="text-sm font-extrabold tracking-tight text-[#F59E0B]">
            Ruffly
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-800">
            Care sheet for {activeDog.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Prepared {today}</p>
        </header>

        <section className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FBF9F5] p-4 print:bg-slate-50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Weight
            </p>
            <p className="font-bold text-slate-800">
              {activeDog.weight} {activeDog.weightUnit}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Daily calories
            </p>
            <p className="font-bold text-[#10B981]">{activeDog.targetDER} kcal</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Feeding schedule
          </h3>
          {feedingPlan.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No bowl plan yet — set portions on the Bowl tab (or primary food on
              Pup).
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {mealFoods.length > 0
                ? mealSessions.map((meal) => (
                    <div
                      key={meal.which}
                      className="rounded-2xl border border-amber-100 p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {meal.label}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {mealFoods.map((item) => (
                          <li
                            key={`${meal.which}-${item.food.id}`}
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
                              {formatMealParts(item.servings, meal.which)}
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
                    Treats
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
    </div>
  )
}
