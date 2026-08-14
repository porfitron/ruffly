/** Home-screen icon badge: Badging API (iOS / desktop) or a due notification (Android). */

export const DUE_NOTIFICATION_TAG = 'ruffly-due-today'

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  if (window.navigator?.standalone) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
}

export function isAppBadgeSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function'
}

export function shouldOfferBadgePermission() {
  if (!isStandaloneDisplay()) return false
  if (typeof Notification === 'undefined') return false
  if (Notification.permission !== 'default') return false
  // iOS: Badging API is present only in the Home Screen app.
  if (isIosDevice()) return isAppBadgeSupported()
  // Android: icon dots come from an unread notification, not setAppBadge.
  return isAndroidDevice()
}

export function badgePromptCopy() {
  if (isIosDevice()) {
    return {
      title: 'Home Screen badge',
      body: 'iOS needs notification permission to show a count on the Ruffly icon when Home dogs still have care due. We won\'t send alerts — just the badge.',
    }
  }
  return {
    title: 'Home Screen badge',
    body: 'Android shows a dot on the app icon when there is an unread reminder. Allow notifications so Ruffly can remind you when Home dogs still have care due.',
  }
}

export async function requestBadgeNotificationPermission() {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function syncAppBadge(count) {
  if (typeof navigator === 'undefined') return Promise.resolve()

  const n = Math.max(0, Math.floor(Number(count) || 0))
  const op =
    n > 0 && typeof navigator.setAppBadge === 'function'
      ? navigator.setAppBadge(n)
      : typeof navigator.clearAppBadge === 'function'
        ? navigator.clearAppBadge()
        : null

  if (op && typeof op.catch === 'function') {
    return op.catch(() => {})
  }
  return Promise.resolve()
}

function dueNotificationCopy(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n <= 0) return null
  return {
    title: n === 1 ? '1 care item left today' : `${n} care items left today`,
    body: 'Open Ruffly to log care for Home dogs.',
  }
}

async function getSwRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => {
        window.setTimeout(() => resolve(null), 4000)
      }),
    ])
  } catch {
    return null
  }
}

async function closeDueNotifications(registration) {
  if (!registration?.getNotifications) return
  const existing = await registration.getNotifications({
    tag: DUE_NOTIFICATION_TAG,
  })
  for (const notification of existing) notification.close()
}

/**
 * Android (and other launchers) only badge a PWA icon when a notification is
 * sitting unread in the shade. Same tag replaces, so logging does not stack.
 */
export async function syncDueNotification(count) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const copy = dueNotificationCopy(count)
  const registration = await getSwRegistration()

  if (!copy) {
    if (registration) await closeDueNotifications(registration)
    return
  }

  const options = {
    body: copy.body,
    tag: DUE_NOTIFICATION_TAG,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    silent: true,
    renotify: false,
    data: { url: '/web/' },
  }

  try {
    if (registration?.showNotification) {
      await registration.showNotification(copy.title, options)
      return
    }
    if (typeof Notification === 'function') {
      new Notification(copy.title, options)
    }
  } catch {
    // Permission or SW can reject; icon badge is best-effort.
  }
}

/** iOS/desktop: Badging API. Android: unread notification → launcher dot. */
export async function syncHomeScreenBadge(count) {
  const tasks = [syncAppBadge(count)]
  if (isAndroidDevice()) tasks.push(syncDueNotification(count))
  await Promise.all(tasks)
}

export function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
