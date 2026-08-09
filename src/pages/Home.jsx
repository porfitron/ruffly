import { Link } from 'react-router-dom'

/**
 * Marketing home placeholder — replace with the real landing when ready.
 * Lives at `/` so ruffly.app serves marketing at the apex.
 */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FBF9F5]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#fde68a55,transparent)]"
        aria-hidden
      />
      <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
        <p className="text-4xl font-extrabold tracking-tight text-[#F59E0B] sm:text-5xl">
          Ruffly
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Precision nutrition for your pup
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-slate-500">
          Dial in daily calories, keep a pantry of real foods, balance the bowl,
          and pack a trip care sheet — all on your phone.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/web"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F59E0B] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-500"
          >
            Open the app
          </Link>
          <Link
            to="/about"
            className="text-sm font-bold text-[#F59E0B] underline-offset-4 hover:underline"
          >
            About us
          </Link>
        </div>
      </main>
    </div>
  )
}
