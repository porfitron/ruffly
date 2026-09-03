import { ArrowLeft } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import ContactForm from '../components/contact/ContactForm'

const INTRO = (
  <p className="text-pretty text-base leading-relaxed text-slate-500">
    Questions, feedback, or something we should know about your pack? Send a
    note — we read every one.
  </p>
)

export default function Contact({ onBack, defaultName = '', defaultEmail = '' }) {
  const fromApp = typeof onBack === 'function'

  if (fromApp) {
    return (
      <div className="relative min-h-dvh overflow-x-hidden bg-[#FBF9F5]">
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
                Contact Us
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                We read every note
              </p>
            </div>
          </header>
          <div className="mt-6">{INTRO}</div>
          <div className="mt-6">
            <ContactForm
              defaultName={defaultName}
              defaultEmail={defaultEmail}
              source="App"
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <MarketingShell source="Contact us" current="contact">
      <main className="mx-auto max-w-lg px-5 pb-4 pt-10">
        <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-800">
          Contact us
        </h1>
        <div className="mt-3">{INTRO}</div>
        <div className="mt-8">
          <ContactForm source="Marketing" />
        </div>
      </main>
    </MarketingShell>
  )
}
