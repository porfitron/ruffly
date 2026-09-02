import { Link } from 'react-router-dom'
import {
  ClipboardList,
  MessageCircle,
  NotebookPen,
  PawPrint,
  Printer,
  Share,
  Smartphone,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import Card from '../components/ui/Card'
import { track } from '../analytics'

/** Glue the last two words so a paragraph doesn’t end on a lone word. */
function noWidow(text) {
  return text.replace(/\s+(\S+)\s*$/, '\u00a0$1')
}

const FEATURES = [
  {
    id: 'life-log',
    kicker: 'Life log',
    title: 'Keep a record of the life',
    benefit: 'You’ll remember what actually happened.',
    icon: NotebookPen,
    body: 'Dogs do a hundred little things a week that you’d swear you’ll remember — and then you don’t. Log the snack they stole off the ground, the trick they finally nailed, the siren that spooked them, the animal they couldn’t ignore. When the vet asks, or you just want to look back, you have the record.',
  },
  {
    id: 'routine',
    kicker: 'Daily routine',
    title: 'Run it yourself, or hand it off',
    benefit: 'What’s due today stays obvious — even when you’re not there.',
    icon: ClipboardList,
    body: 'Put breakfast, meds, supplements, and walks on a checklist you tap through each day. Check them off at home, or pass the day to whoever is watching.',
  },
  {
    id: 'pack',
    kicker: 'The pack',
    title: 'Dogs can come in and out of care',
    benefit: 'One dog or many — each on their own plan.',
    icon: PawPrint,
    body: 'Built for people who have, foster, or sit more than one dog. Bring someone onto a meal or medication plan, pause tracking when they’re away, and pick it back up when they come back.',
  },
  {
    id: 'fleamail',
    kicker: 'Fleamail',
    title: 'Let them speak for themselves',
    benefit: 'Memorable moments, in their voice.',
    icon: MessageCircle,
    body: 'Send a short note from dog to parent when something’s worth sharing. A proud first, a funny fail, a “I was very brave today.” They can’t text — Ruffly sends it for them.',
  },
]

const HANDOFF = [
  {
    id: 'print',
    icon: Printer,
    title: 'Print a care guide',
    body: 'Generate a printed guide for each dog when you leave them with a sitter — meals, meds, and how they like to be cared for.',
  },
  {
    id: 'sitter-app',
    icon: Smartphone,
    title: 'Or let the sitter use Ruffly',
    body: 'They can open the same daily checklist you use at home and check things off as they go.',
  },
  {
    id: 'pupdate',
    icon: Share,
    title: 'Send a Pupdate',
    body: 'A snapshot of today’s log so everyone can see where you are — they’ve been out already, they had their medication, what’s still due.',
  },
]

/**
 * Marketing home at `/` so ruffly.app serves the value prop at the apex.
 */
export default function Home() {
  return (
    <MarketingShell source="Home" current="home">
      <main className="mx-auto max-w-3xl px-5 pb-4 pt-10 sm:pt-14">
        <p className="text-sm font-bold uppercase tracking-wide text-[#F59E0B]">
          Daily logbook for your pack
        </p>
        <h1 className="mt-2 max-w-xl text-balance text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          Everything that happens with your dog, in one place.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
          {noWidow(
            'Log the life. Run the routine. Hand it off. Let them send a Fleamail home.',
          )}
        </p>
        <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-slate-500">
          {noWidow(
            'Ruffly is for the meals and meds, the close calls and new tricks, and a routine you can run yourself or give to a sitter.',
          )}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/web"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F59E0B] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-500"
            onClick={() => track('open_app', { source: 'Home hero' })}
          >
            Open the app
          </Link>
          <a
            href="#features"
            className="text-sm font-bold text-[#F59E0B] underline-offset-4 hover:underline"
          >
            See what it can do
          </a>
        </div>

        <section id="features" className="scroll-mt-24 pt-14 sm:pt-16">
          <h2 className="text-balance text-xl font-extrabold tracking-tight text-slate-800 sm:text-2xl">
            What Ruffly is for
          </h2>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-slate-500 sm:text-base">
            {noWidow(
              'A logbook for the life, the routine, and the handoff — so the day with your dog doesn’t disappear.',
            )}
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <li key={feature.id}>
                  <Card className="flex h-full flex-col">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-[#F59E0B]">
                      <Icon size={22} strokeWidth={2.25} aria-hidden />
                    </span>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#F59E0B]">
                      {feature.kicker}
                    </p>
                    <h3 className="mt-1 text-balance text-lg font-extrabold tracking-tight text-slate-800">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-pretty text-sm font-semibold text-slate-600">
                      {noWidow(feature.benefit)}
                    </p>
                    <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-500">
                      {noWidow(feature.body)}
                    </p>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="pt-12 sm:pt-14">
          <h2 className="text-balance text-xl font-extrabold tracking-tight text-slate-800 sm:text-2xl">
            When someone else is watching
          </h2>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-slate-500 sm:text-base">
            {noWidow(
              'A trip, a sitter, a partner taking the next shift — keep everyone on the same day.',
            )}
          </p>
          <Card className="mt-6 !p-2 sm:!p-3">
            <ul>
              {HANDOFF.map((item, index) => {
                const Icon = item.icon
                return (
                  <li
                    key={item.id}
                    className={`flex gap-3 px-3 py-4 ${
                      index > 0 ? 'border-t border-amber-100' : ''
                    }`}
                  >
                    <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[#F59E0B]">
                      <Icon size={22} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-tight text-slate-800">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-slate-500">
                        {noWidow(item.body)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>

        <section className="pt-12 sm:pt-14">
          <Card className="bg-amber-50/70 sm:p-8">
            <h2 className="text-balance text-xl font-extrabold tracking-tight text-slate-800 sm:text-2xl">
              Start a log for your pack
            </h2>
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-slate-500 sm:text-base">
              {noWidow(
                'Free to use. Add a dog, log a moment, check off today — then send a Pupdate or a printed guide when someone else is watching.',
              )}
            </p>
            <Link
              to="/web"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F59E0B] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-500"
              onClick={() => track('open_app', { source: 'Home closing' })}
            >
              Open the app
            </Link>
          </Card>
        </section>
      </main>
    </MarketingShell>
  )
}
