import { Link } from 'react-router-dom'
import BrandMark from '../ui/BrandMark'
import { track } from '../../analytics'

const footerLinkClassName =
  'font-bold text-slate-500 underline-offset-4 hover:underline'

const COPYRIGHT_YEAR = new Date().getFullYear()

/**
 * Shared chrome for marketing routes (`/`, `/about`, `/contact`).
 * Keeps the oatmeal canvas, wordmark, and Open-the-app CTA consistent.
 */
export default function MarketingShell({
  children,
  source = 'Home',
  current = 'home',
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#FBF9F5]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#fde68a55,transparent)]"
        aria-hidden
      />

      <header className="sticky top-0 z-10 border-b border-amber-100/80 bg-[#FBF9F5]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            to="/"
            className="flex min-h-12 items-center gap-2.5"
            aria-label="Ruffly home"
          >
            <BrandMark className="h-10 w-10 shadow-sm" />
            <span className="text-2xl font-extrabold tracking-tight text-[#F59E0B]">
              Ruffly
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            {current !== 'about' ? (
              <Link
                to="/about"
                className="hidden text-sm font-bold text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline sm:inline"
              >
                About
              </Link>
            ) : null}
            {current !== 'contact' ? (
              <Link
                to="/contact"
                className="hidden text-sm font-bold text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline sm:inline"
              >
                Contact
              </Link>
            ) : null}
            <Link
              to="/web"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-500"
              onClick={() => track('open_app', { source })}
            >
              Open the app
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative">{children}</div>

      <footer className="relative mx-auto max-w-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-amber-100 pt-6 text-sm">
          <div className="flex flex-wrap gap-4">
            {current !== 'home' ? (
              <Link to="/" className={footerLinkClassName}>
                Home
              </Link>
            ) : null}
            {current !== 'about' ? (
              <Link to="/about" className={footerLinkClassName}>
                About us
              </Link>
            ) : null}
            {current !== 'contact' ? (
              <Link to="/contact" className={footerLinkClassName}>
                Contact us
              </Link>
            ) : null}
            <Link
              to="/web"
              className="font-bold text-[#F59E0B] underline-offset-4 hover:underline"
              onClick={() => track('open_app', { source: `${source} footer` })}
            >
              Open the app
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-400">
          © {COPYRIGHT_YEAR} Ruffly.app
        </p>
      </footer>
    </div>
  )
}
