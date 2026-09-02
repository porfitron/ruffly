import { ArrowLeft } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'

export default function About({ onBack }) {
  const fromApp = typeof onBack === 'function'

  const story = (
    <>
      <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-800">
        A logbook for every dog you look after
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-slate-500">
        Ruffly keeps a record of the life — meals and meds, yes, but also the
        snack off the sidewalk, the new trick, the sound that spooked them, the
        animal they couldn&apos;t&nbsp;ignore.
      </p>
      <p className="mt-3 text-pretty text-base leading-relaxed text-slate-500">
        Put a dog on a daily routine you check off at home, or hand the same
        plan to someone watching them while you&apos;re away. Print a care
        guide for each dog, let the sitter use the app, or send a Pupdate that
        shows what&apos;s already&nbsp;done.
      </p>
      <p className="mt-3 text-pretty text-base leading-relaxed text-slate-500">
        Care for one pup or a pack that comes in and out of your care, on and
        off meal and medication&nbsp;plans.
      </p>
      <p className="mt-3 text-pretty text-base leading-relaxed text-slate-500">
        And when something&apos;s worth sharing, send a Fleamail — a short note
        from dog to parent — so they can speak for&nbsp;themselves.
      </p>
    </>
  )

  if (fromApp) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-[#FBF9F5]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#fde68a55,transparent)]"
          aria-hidden
        />
        <main className="relative mx-auto max-w-lg px-5 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
          <header className="flex items-start gap-3">
            <button
              type="button"
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-slate-700 shadow-sm hover:bg-amber-50"
              aria-label="Back"
              onClick={onBack}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-[#F59E0B]">
                About Us
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                What Ruffly is for
              </p>
            </div>
          </header>
          <div className="mt-6">{story}</div>
        </main>
      </div>
    )
  }

  return (
    <MarketingShell source="About us" current="about">
      <main className="mx-auto max-w-lg px-5 pb-4 pt-10">{story}</main>
    </MarketingShell>
  )
}
