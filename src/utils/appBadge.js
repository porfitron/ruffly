/** Home-screen icon badge via the Badging API (installed PWAs). */

export function syncAppBadge(count) {
  if (typeof navigator === 'undefined') return

  const n = Math.max(0, Math.floor(Number(count) || 0))
  const op =
    n > 0 && typeof navigator.setAppBadge === 'function'
      ? navigator.setAppBadge(n)
      : typeof navigator.clearAppBadge === 'function'
        ? navigator.clearAppBadge()
        : null

  if (op && typeof op.catch === 'function') {
    op.catch(() => {})
  }
}

export function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
