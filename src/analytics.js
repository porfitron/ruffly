import { useEffect } from 'react'
import { isStandaloneDisplay } from './utils/appBadge'

/**
 * Google Analytics 4 for ruffly.app
 *
 * Events are named so they read as English in GA (Reports → Engagement → Events).
 * Parameter values are Title Case labels, not codes, so breakdowns stay readable.
 *
 * In GA Admin → Data display → Custom definitions, register these event-scoped
 * dimensions so they appear as columns (suggested display names in quotes):
 *   event_label     → "Action"
 *   content_group   → "Area"
 *   item_kind       → "Item type"
 *   method          → "How"
 *   source          → "Screen"
 *   result          → "Result"
 *   calorie_mode    → "Calorie mode"
 *   slot            → "Menu slot"
 *
 * DebugView: add ?ga_debug=1 to any URL (sends to this property with debug_mode).
 */

export const GA_MEASUREMENT_ID = 'G-63B163GZQQ'

/** Virtual screens → path + title shown in GA Pages / Screens. */
export const SCREENS = {
  home: { path: '/', title: 'Home' },
  about: { path: '/about', title: 'About us' },
  today: { path: '/web/today', title: 'Today' },
  pack: { path: '/web/pack', title: 'Pack' },
  catalog: { path: '/web/catalog', title: 'Catalog' },
  care: { path: '/web/care', title: 'Care guide' },
  account: { path: '/web/account', title: 'My Account' },
}

/**
 * Event name → human label + area.
 * The name is what GA lists; the label is sent as event_label for breakdowns.
 */
const EVENT_CATALOG = {
  open_add_dog: { label: 'Started adding a dog', group: 'Dogs' },
  add_dog: { label: 'Added a dog', group: 'Dogs' },
  cancel_add_dog: { label: 'Cancelled adding a dog', group: 'Dogs' },
  edit_dog: { label: 'Saved dog profile', group: 'Dogs' },
  remove_dog: { label: 'Removed a dog', group: 'Dogs' },
  set_dog_presence: { label: 'Changed home / away', group: 'Dogs' },

  open_log_sheet: { label: 'Opened log sheet', group: 'Logs' },
  select_log_type: { label: 'Chose what to log', group: 'Logs' },
  create_log_entry: { label: 'Created a log entry', group: 'Logs' },
  edit_log_entry: { label: 'Edited a log entry', group: 'Logs' },
  delete_log_entry: { label: 'Deleted a log entry', group: 'Logs' },
  abandon_log_sheet: { label: 'Closed log without saving', group: 'Logs' },

  check_off_routine: { label: 'Checked off a routine item', group: 'Routines' },
  undo_routine: { label: 'Undid a routine check', group: 'Routines' },
  complete_meal: { label: 'Completed a meal', group: 'Routines' },
  open_routine_editor: { label: 'Opened routine editor', group: 'Routines' },
  add_routine_item: { label: 'Added an item to a routine', group: 'Routines' },
  remove_routine_item: { label: 'Removed an item from a routine', group: 'Routines' },
  close_routine_editor: { label: 'Closed routine editor', group: 'Routines' },

  add_catalog_item: { label: 'Added a catalog item', group: 'Catalog' },
  edit_catalog_item: { label: 'Edited a catalog item', group: 'Catalog' },
  remove_catalog_item: { label: 'Removed a catalog item', group: 'Catalog' },

  share_today_log: { label: 'Shared today’s log', group: 'Sharing' },
  send_fleamail: { label: 'Sent Fleamail', group: 'Sharing' },
  export_plan: { label: 'Exported a plan', group: 'Sharing' },
  import_plan: { label: 'Imported a plan', group: 'Sharing' },
  print_care_guide: { label: 'Printed a care guide', group: 'Care' },
  save_care_contacts: { label: 'Saved care contacts', group: 'Care' },

  save_account: { label: 'Saved account', group: 'Account' },
  reset_app: { label: 'Reset the app', group: 'App' },
  open_app: { label: 'Opened the app', group: 'App' },
  enable_home_badge: { label: 'Enabled home-screen badge', group: 'App' },
  dismiss_home_badge: { label: 'Dismissed home-screen badge', group: 'App' },
  join_pro_waitlist: { label: 'Joined Pro waitlist', group: 'App' },
}

const KIND_LABELS = {
  food: 'Food',
  med: 'Medication',
  supplement: 'Supplement',
  weight: 'Weight',
  activity: 'Activity',
  note: 'Note',
  fleamail: 'Fleamail',
}

const SLOT_LABELS = {
  breakfast: 'Breakfast',
  evening: 'Evening',
  daily: 'Daily',
  as_needed: 'As needed',
}

const SHARE_RESULT_LABELS = {
  shared: 'Shared',
  downloaded: 'Downloaded',
  cancelled: 'Cancelled',
  failed: 'Failed',
  'needs-gesture': 'Needs extra tap',
}

let initialized = false
let lastScreenKey = null

function isDebugMode() {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).has('ga_debug')) return true
    return window.localStorage?.getItem('ga_debug') === '1'
  } catch {
    return false
  }
}

function isEnabled() {
  if (typeof window === 'undefined') return false
  if (isDebugMode()) return true
  return import.meta.env.PROD
}

function gtag() {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(arguments)
}

function appMode() {
  return isStandaloneDisplay() ? 'Home screen' : 'Browser'
}

function origin() {
  if (typeof window === 'undefined') return 'https://ruffly.app'
  return window.location.origin
}

/** Title Case labels for log / catalog kinds. */
export function kindLabel(kind) {
  return KIND_LABELS[kind] || kind || 'Unknown'
}

export function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot || 'Daily'
}

export function shareResultLabel(status) {
  return SHARE_RESULT_LABELS[status] || status || 'Unknown'
}

/**
 * Load gtag and configure the property. Safe to call more than once.
 * No events are sent from localhost unless ?ga_debug=1 is present.
 */
export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || gtag

  if (!isEnabled()) return

  const debug = isDebugMode()
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  gtag('js', new Date())
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    debug_mode: debug || undefined,
  })
}

function commonParams() {
  return {
    app_mode: appMode(),
  }
}

/**
 * Send a named event. Unknown names still fire; known ones get a readable
 * event_label and content_group automatically.
 */
export function track(eventName, params = {}) {
  const meta = EVENT_CATALOG[eventName]
  const payload = {
    ...commonParams(),
    ...(meta
      ? { event_label: meta.label, content_group: meta.group }
      : {}),
    ...params,
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', eventName, payload)
  }

  if (!isEnabled()) return
  gtag('event', eventName, payload)
}

/** Record a virtual screen so GA Pages shows Today / Pack / Catalog, not only /web. */
export function trackScreen(screenKey) {
  if (!screenKey || screenKey === lastScreenKey) return
  const screen = SCREENS[screenKey]
  if (!screen) return
  lastScreenKey = screenKey

  const pageLocation = `${origin()}${screen.path}`
  const payload = {
    ...commonParams(),
    page_title: screen.title,
    page_location: pageLocation,
    page_path: screen.path,
    content_group: screen.title,
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics] page_view', payload)
  }

  if (!isEnabled()) return
  gtag('event', 'page_view', payload)
}

export function trackException(description, { fatal = false } = {}) {
  const payload = {
    ...commonParams(),
    description,
    fatal,
    event_label: description,
    content_group: 'Issues',
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics] exception', payload)
  }

  if (!isEnabled()) return
  gtag('event', 'exception', payload)
}

/** Audience attributes (no names, emails, or other PII). */
export function setUserContext({ packSize, hasRoutine } = {}) {
  if (!isEnabled()) return
  const properties = {
    app_mode: appMode(),
  }
  if (packSize != null) properties.pack_size = String(packSize)
  if (hasRoutine != null) properties.has_routine = hasRoutine ? 'Yes' : 'No'
  gtag('set', 'user_properties', properties)
}

export function useAnalyticsScreen(screenKey) {
  useEffect(() => {
    if (screenKey) trackScreen(screenKey)
  }, [screenKey])
}
