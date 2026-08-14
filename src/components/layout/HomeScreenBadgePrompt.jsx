import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import {
  requestBadgeNotificationPermission,
  shouldOfferIosBadgePermission,
  syncAppBadge,
} from '../../utils/appBadge'
import { countPackDueTasks } from '../../utils/todayCare'

/**
 * iOS will not draw a Home Screen badge until Notification permission is
 * granted, and that prompt must come from a tap.
 */
export default function HomeScreenBadgePrompt() {
  const { dogs, menusByDogId, catalog, logs, badgePromptDismissed, dispatch } =
    useApp()
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(() => shouldOfferIosBadgePermission())

  if (badgePromptDismissed || !visible) return null

  function dismiss() {
    setVisible(false)
    dispatch({ type: 'DISMISS_BADGE_PROMPT' })
  }

  async function enable() {
    setBusy(true)
    const permission = await requestBadgeNotificationPermission()
    setBusy(false)
    if (permission === 'granted') {
      await syncAppBadge(
        countPackDueTasks(dogs, menusByDogId, catalog, logs),
      )
    }
    dismiss()
  }

  return (
    <Card className="print:hidden space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-800">Home Screen badge</p>
        <p className="mt-1 text-sm text-slate-500">
          iOS needs notification permission to show a count on the Ruffly icon
          when Home dogs still have care due. We won&apos;t send alerts — just
          the badge.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" onClick={enable} disabled={busy}>
          Enable badge
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={dismiss}
          disabled={busy}
        >
          Not now
        </Button>
      </div>
    </Card>
  )
}
