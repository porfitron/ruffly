import { Link } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import { track } from '../analytics'

export default function About() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FBF9F5]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#fde68a55,transparent)]"
        aria-hidden
      />
      <main className="relative mx-auto max-w-lg px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <BrandMark className="h-14 w-14 shadow-sm" />
          <p className="text-4xl font-extrabold tracking-tight text-[#F59E0B]">
            Ruffly
          </p>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-800">
          Care logging for every dog you look after
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-500">
          Ruffly is a simple daily logbook for meals, meds, supplements, and
          weight — with a recommended calorie target and a menu for each dog.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-500">
          Built like a plant-care app: see what&apos;s due today, check it off,
          and keep profiles handy when you need them.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/web"
            className="text-sm font-bold text-[#F59E0B] underline-offset-4 hover:underline"
            onClick={() => track('open_app', { source: 'About us' })}
          >
            Open the app
          </Link>
          <Link
            to="/"
            className="text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  )
}
