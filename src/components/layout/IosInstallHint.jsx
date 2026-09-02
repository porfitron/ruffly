import { Plus, Share } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import {
  iosInstallHintCopy,
  shouldOfferIosInstallHint,
} from '../../utils/pwaInstall'
import { track } from '../../analytics'

const STEPS = [
  { icon: Share, label: 'Tap Share' },
  { icon: Plus, label: 'Add to Home Screen' },
]

/**
 * iOS has no native PWA install prompt. Android Chrome can show its own.
 */
export default function IosInstallHint() {
  const { iosInstallHintDismissed, dispatch } = useApp()
  const copy = iosInstallHintCopy()

  if (iosInstallHintDismissed || !shouldOfferIosInstallHint()) return null

  function dismiss() {
    dispatch({ type: 'DISMISS_IOS_INSTALL_HINT' })
    track('dismiss_ios_install')
  }

  return (
    <Card className="print:hidden space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-800">{copy.title}</p>
        <p className="mt-1 text-sm text-slate-500">{copy.body}</p>
      </div>
      <ol className="space-y-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#F59E0B]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-slate-800">
                <span className="mr-2 text-slate-400">{index + 1}.</span>
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      <Button variant="secondary" className="w-full" onClick={dismiss}>
        Got it
      </Button>
    </Card>
  )
}
