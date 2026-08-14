/** Home-screen icon badge via the Badging API (installed PWAs). */

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  if (window.navigator?.standalone) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ reports as MacIntel
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isAppBadgeSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function'
}

/**
 * iOS Home Screen web apps expose setAppBadge, but the icon stays blank
 * until the user grants Notification permission (WebKit / iOS 16.4+).
 */
export function badgeNeedsIosNotificationPermission() {
  if (!isAppBadgeSupported()) return false
  if (!isIosDevice()) return false
  if (typeof Notification === 'undefined') return false
  return Notification.permission !== 'granted'
}

export function shouldOfferIosBadgePermission() {
  return (
    isStandaloneDisplay() &&
    badgeNeedsIosNotificationPermission() &&
    Notification.permission === 'default'
  )
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

export function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
