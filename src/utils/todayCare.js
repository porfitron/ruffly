/** Calendar day helpers + “what’s due today” from menus vs logs. */

import { isDogAway } from './dogs'

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isSameLocalDay(isoOrDate, day = new Date()) {
  if (!isoOrDate) return false
  const a = startOfLocalDay(new Date(isoOrDate))
  const b = startOfLocalDay(day)
  return a.getTime() === b.getTime()
}

export function logsForDogOnDay(logs, dogId, day = new Date()) {
  return (logs ?? []).filter(
    (log) => log.dogId === dogId && isSameLocalDay(log.loggedAt, day),
  )
}

export function foodKcalLoggedToday(logs, dogId, day = new Date()) {
  return logsForDogOnDay(logs, dogId, day)
    .filter((log) => log.kind === 'food')
    .reduce((sum, log) => sum + (Number(log.kcal) || 0), 0)
}

/** Best-effort kcal from catalog densities when logging food. */
export function estimateFoodKcal(careItem, amount) {
  if (!careItem || careItem.kind !== 'food') return null
  const qty = Number(amount)
  if (!Number.isFinite(qty) || qty <= 0) return null

  if (careItem.kcalPerUnit != null && Number(careItem.kcalPerUnit) > 0) {
    return Math.round(qty * Number(careItem.kcalPerUnit))
  }
  // Treat amount as grams when kcal/kg is known
  if (careItem.kcalPerKg != null && Number(careItem.kcalPerKg) > 0) {
    return Math.round((qty / 1000) * Number(careItem.kcalPerKg))
  }
  if (careItem.kcalPerCup != null && Number(careItem.kcalPerCup) > 0) {
    return Math.round(qty * Number(careItem.kcalPerCup))
  }
  if (careItem.kcalPerCan != null && Number(careItem.kcalPerCan) > 0) {
    return Math.round(qty * Number(careItem.kcalPerCan))
  }
  return null
}

function catalogById(catalog) {
  const map = new Map()
  for (const item of catalog ?? []) map.set(item.id, item)
  return map
}

export function slotSortKey(slot) {
  const order = {
    breakfast: 0,
    morning: 0,
    midday: 1,
    lunch: 1,
    afternoon: 2,
    evening: 3,
    dinner: 3,
    night: 4,
    daily: 5,
    as_needed: 9,
  }
  return order[String(slot ?? 'daily').toLowerCase()] ?? 6
}

export function formatSlotLabel(slot) {
  const raw = String(slot ?? 'daily')
  if (raw === 'as_needed') return 'As needed'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

const MEAL_SLOTS = new Set([
  'breakfast',
  'morning',
  'midday',
  'lunch',
  'afternoon',
  'evening',
  'dinner',
  'night',
])

export function isMealSlot(slot) {
  return MEAL_SLOTS.has(String(slot ?? '').toLowerCase())
}

const KIND_ORDER = { food: 0, med: 1, supplement: 2, weight: 3 }

function sortMealItems(a, b) {
  const kind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
  if (kind !== 0) return kind
  return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
    sensitivity: 'base',
  })
}

/**
 * Collapse meal-time slots into one checkable row with component items.
 * Daily / as-needed stay as individual rows.
 */
export function groupTodayTasks(tasks) {
  const buckets = new Map()
  const standalone = []

  for (const task of tasks ?? []) {
    if (isMealSlot(task.slot)) {
      const slot = String(task.slot).toLowerCase()
      if (!buckets.has(slot)) buckets.set(slot, [])
      buckets.get(slot).push(task)
    } else {
      standalone.push(task)
    }
  }

  const meals = [...buckets.entries()].map(([slot, items]) => {
    const sorted = [...items].sort(sortMealItems)
    return {
      type: 'meal',
      id: `${sorted[0].dogId}:meal:${slot}`,
      dogId: sorted[0].dogId,
      slot,
      slotLabel: formatSlotLabel(slot),
      items: sorted,
      done: sorted.every((item) => item.done),
      partial: sorted.some((item) => item.done) && !sorted.every((item) => item.done),
    }
  })

  const rows = [
    ...meals,
    ...standalone.map((task) => ({ type: 'item', id: task.id, task })),
  ]

  rows.sort((a, b) => {
    const aSlot = a.type === 'meal' ? a.slot : a.task.slot
    const bSlot = b.type === 'meal' ? b.slot : b.task.slot
    return slotSortKey(aSlot) - slotSortKey(bSlot)
  })

  return rows
}

/**
 * Pair each menu item with at most one of today's logs.
 * Exact menuItemId wins; leftover logs (quick-log, stale ids) fill the
 * earliest unmatched slot of the same care item so breakfast ≠ evening.
 */
function claimLogsForMenuItems(menuItems, catalog, todayLogs) {
  const byId = catalogById(catalog)
  const remaining = [...(todayLogs ?? [])]
  const claimed = new Map()

  for (const menuItem of menuItems ?? []) {
    if (!menuItem?.id) continue
    const idx = remaining.findIndex((log) => log.menuItemId === menuItem.id)
    if (idx >= 0) claimed.set(menuItem.id, remaining.splice(idx, 1)[0])
  }

  const unmatched = [...(menuItems ?? [])]
    .filter((item) => item?.id && !claimed.has(item.id))
    .sort((a, b) => slotSortKey(a.slot) - slotSortKey(b.slot))

  for (const menuItem of unmatched) {
    const careItem = byId.get(menuItem.careItemId)
    if (!careItem) continue
    const idx = remaining.findIndex(
      (log) =>
        log.careItemId === menuItem.careItemId && log.kind === careItem.kind,
    )
    if (idx >= 0) claimed.set(menuItem.id, remaining.splice(idx, 1)[0])
  }

  return claimed
}

/**
 * Build today’s care rows for one dog.
 * Menu items are due once per local day; completed rows stay visible.
 */
export function buildDogTodayTasks(dog, menuItems, catalog, logs, day = new Date()) {
  const byId = catalogById(catalog)
  const todayLogs = logsForDogOnDay(logs, dog.id, day)
  const claimed = claimLogsForMenuItems(menuItems, catalog, todayLogs)

  const tasks = []
  for (const menuItem of menuItems ?? []) {
    const careItem = byId.get(menuItem.careItemId)
    if (!careItem) continue

    const slot = menuItem.slot ?? 'daily'
    const doneLog = menuItem.id ? claimed.get(menuItem.id) : undefined

    tasks.push({
      id: `${dog.id}:${menuItem.id}`,
      dogId: dog.id,
      dogName: dog.name,
      dogPhotoUrl: dog.photoUrl,
      menuItemId: menuItem.id,
      careItemId: careItem.id,
      kind: careItem.kind,
      name: careItem.formula || careItem.name,
      brand: careItem.brand,
      flavor: careItem.flavor,
      slot,
      slotLabel: formatSlotLabel(slot),
      amount: menuItem.amount ?? careItem.defaultAmount,
      unit: menuItem.unit ?? careItem.unit,
      done: Boolean(doneLog),
      doneAt: doneLog?.loggedAt ?? null,
      doneLogId: doneLog?.id ?? null,
      targetDER: dog.targetDER ?? null,
    })
  }

  tasks.sort((a, b) => slotSortKey(a.slot) - slotSortKey(b.slot))

  return tasks
}

export function buildPackTodayTasks(dogs, menusByDogId, catalog, logs, day = new Date()) {
  const groups = []
  for (const dog of dogs ?? []) {
    if (isDogAway(dog)) continue
    const menu = menusByDogId?.[dog.id] ?? []
    const tasks = buildDogTodayTasks(dog, menu, catalog, logs, day)
    const rows = groupTodayTasks(tasks)
    const kcalLogged = foodKcalLoggedToday(logs, dog.id, day)
    groups.push({
      dog,
      tasks,
      rows,
      dueCount: rows.filter((row) =>
        row.type === 'meal' ? !row.done : !row.task.done,
      ).length,
      doneCount: rows.filter((row) =>
        row.type === 'meal' ? row.done : row.task.done,
      ).length,
      kcalLogged,
      targetDER: dog.targetDER ?? null,
      hasMenu: menu.length > 0,
    })
  }
  groups.sort((a, b) =>
    (a.dog.name || '').localeCompare(b.dog.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
  return groups
}

/** Incomplete Today rows for Home dogs only (Away dogs are skipped). */
export function countPackDueTasks(
  dogs,
  menusByDogId,
  catalog,
  logs,
  day = new Date(),
) {
  return buildPackTodayTasks(dogs, menusByDogId, catalog, logs, day).reduce(
    (sum, group) => sum + group.dueCount,
    0,
  )
}

export function kindLabel(kind) {
  if (kind === 'med') return 'Med'
  if (kind === 'supplement') return 'Supplement'
  if (kind === 'weight') return 'Weight'
  return 'Food'
}
