import { domToPng } from 'modern-screenshot'
import { slugifyName } from './dogs'
import { isSameLocalDay } from './todayCare'

const CREAM = '#FBF9F5'
const IOS_MAX_CANVAS = 4096

export function formatPackUpdateDate(day = new Date()) {
  return day.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function packUpdateCaption(totalDue, day = new Date()) {
  const date = formatPackUpdateDate(day)
  if (totalDue === 0) return `${date} — all caught up`
  const noun = totalDue === 1 ? 'care item' : 'care items'
  const status = isSameLocalDay(day)
    ? `${totalDue} ${noun} left`
    : `${totalDue} ${noun} not logged`
  return `${date} — ${status}`
}

function localIsoDate(day = new Date()) {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function captureOptions() {
  return {
    backgroundColor: CREAM,
    scale: Math.min(2, window.devicePixelRatio || 2),
    maximumCanvasSize: IOS_MAX_CANVAS,
    timeout: 8000,
    style: {
      backgroundColor: CREAM,
      overflow: 'visible',
      boxSizing: 'border-box',
      boxShadow: 'none',
    },
    filter: (el) =>
      !(el instanceof Element && el.classList.contains('share-hide')),
    onCloneEachNode: (cloned) => {
      if (!(cloned instanceof HTMLElement)) return
      cloned.style.setProperty('box-shadow', 'none', 'important')
    },
  }
}

function needsBlankFrameWarmup() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // Android Chrome is slow to screenshot; skip the extra pass so share can
  // still run inside the ~5s user-activation window.
  if (/Android/i.test(ua)) return false
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true
  }
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)
}

async function captureNodePngDataUrl(node) {
  const options = captureOptions()
  // Safari/iOS WebKit often paints a blank first frame.
  if (needsBlankFrameWarmup()) {
    await domToPng(node, options)
  }
  const dataUrl = await domToPng(node, options)
  if (!dataUrl || dataUrl.length < 1000) {
    throw new Error('Couldn’t create a photo of the log. Try again.')
  }
  return dataUrl
}

function dataUrlToFile(dataUrl, filename) {
  const comma = dataUrl.indexOf(',')
  const header = comma >= 0 ? dataUrl.slice(0, comma) : ''
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const mime = /data:(.*?);/.exec(header)?.[1] || 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mime })
}

function uniquePngName(name, date, used) {
  const base = slugifyName(name) || 'pup'
  let filename = `ruffly-log-${base}-${date}.png`
  let n = 2
  while (used.has(filename)) {
    filename = `ruffly-log-${base}-${n}-${date}.png`
    n += 1
  }
  used.add(filename)
  return filename
}

function downloadFile(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadFiles(files) {
  files.forEach((file, i) => {
    window.setTimeout(() => downloadFile(file), i * 200)
  })
}

function canShareFiles(files) {
  try {
    return Boolean(navigator.canShare?.({ files }))
  } catch {
    return false
  }
}

function hasTransientActivation() {
  if (!navigator.userActivation) return true
  return navigator.userActivation.isActive
}

/**
 * Android Chrome only allows navigator.share() while a tap is still “active”
 * (~5s). Screenshot capture usually burns that window, so the first attempt
 * may return 'needs-gesture' and the UI should offer a second Share tap.
 */
async function shareFiles(
  files,
  { title, text },
  { allowGestureFallback = true } = {},
) {
  if (canShareFiles(files) || typeof navigator.share === 'function') {
    if (allowGestureFallback && !hasTransientActivation()) {
      return 'needs-gesture'
    }
    try {
      await navigator.share({ files, title, text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      if (allowGestureFallback && err?.name === 'NotAllowedError') {
        return 'needs-gesture'
      }
    }
  }

  downloadFiles(files)
  return 'downloaded'
}

function packSharePayload(captures, files, { totalDue, day }) {
  return {
    files,
    title:
      captures.length === 1
        ? `${captures[0].name || 'Log'} · Ruffly`
        : 'Ruffly pack log',
    text: packUpdateCaption(totalDue, day),
  }
}

/** Share files already captured. Call from a click handler with no awaits first. */
export async function sharePreparedLog({ files, title, text }) {
  return shareFiles(files, { title, text }, { allowGestureFallback: false })
}

/** Capture each dog card as its own PNG and open the system share sheet. */
export async function shareTodayScreenshots(
  items,
  { totalDue = 0, day = new Date() } = {},
) {
  const captures = (items ?? []).filter((item) => item?.node)
  if (captures.length === 0) {
    throw new Error('Couldn’t create a photo of the log. Try again.')
  }

  const date = localIsoDate(day)
  const used = new Set()
  const files = []
  for (const { node, name } of captures) {
    const dataUrl = await captureNodePngDataUrl(node)
    files.push(
      dataUrlToFile(dataUrl, uniquePngName(name, date, used)),
    )
  }

  const payload = packSharePayload(captures, files, { totalDue, day })
  const status = await shareFiles(payload.files, payload)
  return { status, ...payload }
}
