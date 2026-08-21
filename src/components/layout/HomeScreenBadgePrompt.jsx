import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import {
  badgePromptCopy,
  requestBadgeNotificationPermission,
  shouldOfferBadgePermission,
  syncHomeScreenBadge,
} from '../../utils/appBadge'
import { countPackDueTasks } from '../../utils/todayCare'
import { track } from '../../analytics'

/**
 * iOS needs a tap to grant notification permission before setAppBadge draws.
 * Android ignores setAppBadge and only dots the icon for an unread notification.
 */
export default function HomeScreenBadgePrompt() {
  const { dogs, menusByDogId, catalog, logs, badgePromptDismissed, dispatch } =
    useApp()
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(() => shouldOfferBadgePermission())
  const copy = badgePromptCopy()

  if (badgePromptDismissed || !visible) return null

  function dismiss({ fromEnable = false } = {}) {
    setVisible(false)
    dispatch({ type: 'DISMISS_BADGE_PROMPT' })
    if (!fromEnable) track('dismiss_home_badge')
  }

  async function enable() {
    setBusy(true)
    const permission = await requestBadgeNotificationPermission()
    setBusy(false)
    track('enable_home_badge', {
      result:
        permission === 'granted'
          ? 'Granted'
          : permission === 'denied'
            ? 'Denied'
            : 'Dismissed',
    })
    if (permission === 'granted') {
      await syncHomeScreenBadge(
        countPackDueTasks(dogs, menusByDogId, catalog, logs),
      )
    }
    dismiss({ fromEnable: true })
  }

  return (
    <Card className="print:hidden space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-800">{copy.title}</p>
        <p className="mt-1 text-sm text-slate-500">{copy.body}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" onClick={enable} disabled={busy}>
          Enable badge
        </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => dismiss()}
            disabled={busy}
          >
          Not now
        </Button>
      </div>
    </Card>
  )
}
