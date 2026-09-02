import { isIosDevice, isStandaloneDisplay } from './appBadge'

/** Safari on iPhone / iPad — the only iOS browser that can install a real PWA. */
export function isIosSafari() {
  if (!isIosDevice()) return false
  const ua = navigator.userAgent || ''
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)) return false
  if (/FBAN|FBAV|Instagram/i.test(ua)) return false
  return /Safari/i.test(ua)
}

export function shouldOfferIosInstallHint() {
  if (typeof window === 'undefined') return false
  if (isStandaloneDisplay()) return false
  if (isIosDevice()) return true
  return import.meta.env.DEV && previewIosInstallHint()
}

function previewIosInstallHint() {
  try {
    return new URLSearchParams(window.location.search).has('ios_install_hint')
  } catch {
    return false
  }
}

export function iosInstallHintCopy() {
  if (!isIosSafari() && isIosDevice()) {
    return {
      title: 'Add to Home Screen',
      body: 'Open this page in Safari, then tap Share and Add to Home Screen. That’s how iOS installs web apps.',
    }
  }
  return {
    title: 'Add to Home Screen',
    body: 'Tap Share, then Add to Home Screen. iOS has no install button — after that, Ruffly opens like an app.',
  }
}
