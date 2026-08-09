import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FBF9F5]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#fde68a55,transparent)]"
        aria-hidden
      />
      <main className="relative mx-auto max-w-lg px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="text-4xl font-extrabold tracking-tight text-[#F59E0B]">
          Ruffly
        </p>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-800">
          Precision nutrition for your pup
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-500">
          Ruffly helps you dial in daily calories, keep a pantry of real foods,
          balance the bowl, and pack a trip care sheet — all on your phone.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-500">
          Built for dog people who care about the numbers behind the bowl.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/web"
            className="text-sm font-bold text-[#F59E0B] underline-offset-4 hover:underline"
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
