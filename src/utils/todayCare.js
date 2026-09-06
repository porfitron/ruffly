/** Calendar day helpers + “what’s due today” from menus vs logs. */

import { isDogAway, isDogTracking } from './dogs'

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addLocalDays(date, delta) {
  const d = startOfLocalDay(date)
  d.setDate(d.getDate() + delta)
  return d
}

export function isSameLocalDay(isoOrDate, day = new Date()) {
  if (!isoOrDate) return false
  const a = startOfLocalDay(new Date(isoOrDate))
  const b = startOfLocalDay(day)
  return a.getTime() === b.getTime()
}

/** "Today" on the current local day, otherwise MM/DD/YY. */
export function formatTodayHeading(day = new Date(), now = new Date()) {
  if (isSameLocalDay(day, now)) return 'Today'
  const d = startOfLocalDay(day)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

/** Stamp a log on `day`, keeping the current clock time. */
export function isoTimestampOnDay(day, now = new Date()) {
  if (isSameLocalDay(day, now)) return now.toISOString()
  const d = startOfLocalDay(day)
  d.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )
  return d.toISOString()
}

/** `HH:MM` for `<input type="time">`. */
export function timeInputFromDate(isoOrDate = new Date()) {
  const d = new Date(isoOrDate)
  const source = Number.isNaN(d.getTime()) ? new Date() : d
  const h = String(source.getHours()).padStart(2, '0')
  const m = String(source.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** `YYYY-MM-DD` for `<input type="date">`. */
export function dateInputFromDate(isoOrDate = new Date()) {
  const d = new Date(isoOrDate)
  const source = Number.isNaN(d.getTime()) ? new Date() : d
  const y = source.getFullYear()
  const m = String(source.getMonth() + 1).padStart(2, '0')
  const day = String(source.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local calendar day from a `YYYY-MM-DD` date input. */
export function dayFromDateInput(yyyyMmDd, fallback = new Date()) {
  const [yRaw, mRaw, dRaw] = String(yyyyMmDd ?? '').split('-')
  const year = Number(yRaw)
  const month = Number(mRaw)
  const day = Number(dRaw)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return startOfLocalDay(fallback)
  }
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return startOfLocalDay(fallback)
  return startOfLocalDay(parsed)
}

/** Stamp `day` at a local `HH:MM` time. */
export function isoTimestampOnDayAt(day, timeHHmm, now = new Date()) {
  const [hRaw, mRaw] = String(timeHHmm ?? '').split(':')
  const hours = Number(hRaw)
  const minutes = Number(mRaw)
  const d = startOfLocalDay(day)
  d.setHours(
    Number.isFinite(hours) ? hours : now.getHours(),
    Number.isFinite(minutes) ? minutes : now.getMinutes(),
    0,
    0,
  )
  return d.toISOString()
}

/** Short local time, e.g. "7:32 AM". */
export function formatLogTime(isoOrDate) {
  if (!isoOrDate) return ''
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
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
    extra: 10,
  }
  return order[String(slot ?? 'daily').toLowerCase()] ?? 6
}

export function formatSlotLabel(slot) {
  const raw = String(slot ?? 'daily')
  if (raw === 'as_needed') return 'As needed'
  if (raw === 'extra') return 'Today only'
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

const KIND_ORDER = {
  food: 0,
  med: 1,
  supplement: 2,
  weight: 3,
  activity: 4,
  note: 5,
}

function sortMealItems(a, b) {
  const kind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
  if (kind !== 0) return kind
  return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
    sensitivity: 'base',
  })
}

const QUICK_LOG_KINDS = new Set([
  'food',
  'weight',
  'activity',
  'note',
  'fleamail',
])
const LOG_ONLY_KINDS = new Set(['note', 'fleamail', 'weight'])

const SLOT_DEFAULT_HOUR = {
  breakfast: 8,
  morning: 8,
  midday: 12,
  lunch: 12,
  afternoon: 15,
  evening: 18,
  dinner: 18,
  night: 21,
}

/** Stable key for persisting Today row order (meals, planned items, + logs). */
export function todayRowKey(row) {
  if (!row) return null
  if (row.type === 'meal') return `meal:${String(row.slot).toLowerCase()}`
  const task = row.task
  if (!task) return null
  if (task.oneTime && QUICK_LOG_KINDS.has(task.kind)) {
    return `extra:${task.doneLogId || task.id}`
  }
  if (task.oneTime || !task.menuItemId) return null
  return `item:${task.menuItemId}`
}

export function isTodayDailyRow(row) {
  if (row?.type !== 'item' || !row.task || row.task.oneTime) return false
  return String(row.task.slot ?? 'daily').toLowerCase() === 'daily'
}

export function isTodayQuickLogRow(row) {
  return (
    row?.type === 'item' &&
    Boolean(row.task?.oneTime) &&
    QUICK_LOG_KINDS.has(row.task?.kind)
  )
}

export function todayRowIsDone(row) {
  if (!row) return false
  return row.type === 'meal' ? Boolean(row.done) : Boolean(row.task?.done)
}

/** Menu / checkable care — notes, weigh-ins, and fleamails sit on Today but are not due. */
export function isTodayCheckableRow(row) {
  if (!row) return false
  if (row.type === 'meal') return true
  return !LOG_ONLY_KINDS.has(row.task?.kind)
}

function isFleamailRow(row) {
  return row?.type === 'item' && row.task?.kind === 'fleamail'
}

function timestampMs(isoOrDate) {
  if (!isoOrDate) return null
  const t = new Date(isoOrDate).getTime()
  return Number.isFinite(t) ? t : null
}

function defaultSlotAnchorMs(slot, day) {
  const hour = SLOT_DEFAULT_HOUR[String(slot ?? '').toLowerCase()]
  if (hour == null) return null
  const d = startOfLocalDay(day)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

/** When the meal happened, or a typical time for that slot if it isn’t logged yet. */
function mealAnchorMs(row, day) {
  if (row?.type !== 'meal') return null
  const times = (row.items ?? [])
    .map((item) => timestampMs(item.doneAt))
    .filter((t) => t != null)
  if (times.length) return Math.min(...times)
  return defaultSlotAnchorMs(row.slot, day)
}

function extraLoggedMs(row) {
  return timestampMs(row?.task?.doneAt)
}

/**
 * Place fleamails in the Before / After breakfast or dinner gap that matches
 * when they were sent, using logged meal times when present.
 */
function insertFleamailsByMealTime(rows, extras, day = new Date()) {
  if (!extras.length) return [...rows]
  const result = [...rows]
  const sorted = [...extras].sort((a, b) => {
    const at = extraLoggedMs(a) ?? 0
    const bt = extraLoggedMs(b) ?? 0
    return at - bt
  })
  for (const extra of sorted) {
    const t = extraLoggedMs(extra) ?? Date.now()
    let insertAt = result.length
    for (let i = 0; i < result.length; i += 1) {
      const row = result[i]
      if (row.type !== 'meal') continue
      const anchor = mealAnchorMs(row, day)
      if (anchor == null) continue
      if (anchor > t) {
        insertAt = i
        break
      }
      insertAt = i + 1
    }
    while (
      insertAt < result.length &&
      result[insertAt].type !== 'meal' &&
      isTodayQuickLogRow(result[insertAt]) &&
      (extraLoggedMs(result[insertAt]) ?? 0) <= t
    ) {
      insertAt += 1
    }
    result.splice(insertAt, 0, extra)
  }
  return result
}

/** New + logs sit just above the first completed row until the user drags. */
function insertQuickLogsAboveCompleted(baseRows, extras) {
  if (!extras.length) return [...baseRows]
  const idx = baseRows.findIndex(todayRowIsDone)
  if (idx < 0) return [...baseRows, ...extras]
  return [...baseRows.slice(0, idx), ...extras, ...baseRows.slice(idx)]
}

/** Apply a saved Today order; new rows stay in slot order after known ones. */
export function applyTodayRowOrder(rows, todayRowOrder, day = new Date()) {
  const pinned = []
  const movable = []
  for (const row of rows ?? []) {
    if (todayRowKey(row) == null) pinned.push(row)
    else movable.push(row)
  }

  const byKey = new Map()
  for (const row of movable) byKey.set(todayRowKey(row), row)

  const known = []
  if (Array.isArray(todayRowOrder) && todayRowOrder.length > 0) {
    for (const key of todayRowOrder) {
      const row = byKey.get(key)
      if (!row) continue
      known.push(row)
      byKey.delete(key)
    }
  }

  const leftovers = [...byKey.values()]
  const leftoverQuickLogs = leftovers.filter(isTodayQuickLogRow)
  const leftoverFleamails = leftoverQuickLogs.filter(isFleamailRow)
  const leftoverOtherQuick = leftoverQuickLogs.filter((row) => !isFleamailRow(row))
  const leftoverOther = leftovers.filter((row) => !isTodayQuickLogRow(row))
  const base = known.length > 0 ? [...known, ...leftoverOther] : leftoverOther
  const withQuick = insertQuickLogsAboveCompleted(base, leftoverOtherQuick)
  const ordered = insertFleamailsByMealTime(withQuick, leftoverFleamails, day)

  return [...ordered, ...pinned]
}

/**
 * Collapse meal-time slots into one checkable row with component items.
 * Daily / as-needed stay as individual rows.
 */
export function groupTodayTasks(tasks, todayRowOrder, day = new Date()) {
  const buckets = new Map()
  const standalone = []

  for (const task of tasks ?? []) {
    // One-time logs stay standalone so they are not mixed into the routine meal.
    if (!task.oneTime && isMealSlot(task.slot)) {
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

  return applyTodayRowOrder(rows, todayRowOrder, day)
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

  return { claimed, leftover: remaining }
}

/** Today-only row from a log that is not on the dog’s planned menu. */
function extraTaskFromLog(dog, log, careItem, day = new Date()) {
  const kind = log.kind || careItem?.kind || 'food'
  const note = log.note?.trim() || ''
  const weightLabel = [log.amount, log.unit]
    .filter((part) => part != null && part !== '')
    .join(' ')
  const name =
    kind === 'weight'
      ? weightLabel || 'Weight'
      : kind === 'activity'
        ? log.label || note || 'Activity'
        : kind === 'note'
          ? log.label?.trim() || 'Note'
          : kind === 'fleamail'
            ? kindLabel('fleamail')
            : careItem?.formula || careItem?.name || note || kindLabel(kind)

  return {
    id: `${dog.id}:extra:${log.id}`,
    dogId: dog.id,
    dogName: dog.name,
    dogPhotoUrl: dog.photoUrl,
    menuItemId: null,
    careItemId: log.careItemId ?? null,
    kind,
    name,
    note,
    brand: careItem?.brand,
    flavor: careItem?.flavor,
    category: careItem?.category,
    slot: 'extra',
    slotLabel: isSameLocalDay(day) ? formatSlotLabel('extra') : 'Extra',
    amount: log.amount,
    unit: log.unit,
    done: !LOG_ONLY_KINDS.has(kind),
    doneAt: log.loggedAt ?? null,
    doneLogId: log.id,
    oneTime: true,
    targetDER: dog.targetDER ?? null,
  }
}

/**
 * Build today’s care rows for one dog.
 * Menu items are due once per local day; completed rows stay visible.
 * Unclaimed logs (quick-log extras, weight, one-off meds) appear as
 * today-only tasks and are not added to the planned routine.
 */
export function buildDogTodayTasks(dog, menuItems, catalog, logs, day = new Date()) {
  const byId = catalogById(catalog)
  const todayLogs = logsForDogOnDay(logs, dog.id, day)
  const { claimed, leftover } = claimLogsForMenuItems(
    menuItems,
    catalog,
    todayLogs,
  )

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
      category: careItem.category,
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

  const extras = [...leftover].sort((a, b) => {
    const at = new Date(a.loggedAt ?? 0).getTime()
    const bt = new Date(b.loggedAt ?? 0).getTime()
    return at - bt
  })
  for (const log of extras) {
    const careItem = log.careItemId ? byId.get(log.careItemId) : undefined
    tasks.push(extraTaskFromLog(dog, log, careItem, day))
  }

  tasks.sort((a, b) => slotSortKey(a.slot) - slotSortKey(b.slot))

  return tasks
}

/** Tracking and active dogs in pack order (away dogs are omitted). */
export function buildPackTodayTasks(dogs, menusByDogId, catalog, logs, day = new Date()) {
  const groups = []
  for (const dog of dogs ?? []) {
    if (isDogAway(dog)) continue
    const followsPlan = isDogTracking(dog)
    const storedMenu = menusByDogId?.[dog.id] ?? []
    const menu = followsPlan ? storedMenu : []
    const tasks = buildDogTodayTasks(dog, menu, catalog, logs, day)
    const rows = groupTodayTasks(tasks, dog.todayRowOrder, day)
    const kcalLogged = foodKcalLoggedToday(logs, dog.id, day)
    groups.push({
      dog,
      followsPlan,
      tasks,
      rows,
      dueCount: rows.filter(
        (row) =>
          isTodayCheckableRow(row) &&
          (row.type === 'meal' ? !row.done : !row.task.done),
      ).length,
      doneCount: rows.filter(
        (row) =>
          isTodayCheckableRow(row) &&
          (row.type === 'meal' ? row.done : row.task.done),
      ).length,
      kcalLogged,
      targetDER: dog.targetDER ?? null,
      hasMenu: followsPlan && storedMenu.length > 0,
    })
  }
  return groups
}

function rowSlot(row) {
  if (row?.type === 'meal') return String(row.slot ?? 'daily').toLowerCase()
  return String(row?.task?.slot ?? 'daily').toLowerCase()
}

function rowSlotLabel(row) {
  if (row?.type === 'meal') return row.slotLabel || formatSlotLabel(row.slot)
  return row?.task?.slotLabel || formatSlotLabel(row?.task?.slot)
}

function nextMealSlot(rows, fromIndex) {
  for (let i = fromIndex + 1; i < rows.length; i += 1) {
    if (rows[i]?.type === 'meal') return rowSlot(rows[i])
  }
  return null
}

/** Pack-level gap for a non-meal row, using that dog’s By dog order. */
function packGapKey(prevMeal, nextMeal, packMeals) {
  if (prevMeal) return `after:${prevMeal}`
  if (!nextMeal) return 'other'
  const idx = packMeals.indexOf(nextMeal)
  if (idx > 0) return `after:${packMeals[idx - 1]}`
  return 'start'
}

function uniqueSlotLabels(entries) {
  const labels = []
  const seen = new Set()
  for (const { row } of entries ?? []) {
    const label = rowSlotLabel(row)
    if (!label || seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  return labels
}

function isGenericExtraLabel(label) {
  const raw = String(label ?? '').toLowerCase()
  return raw === 'today only' || raw === 'extra'
}

function gapSectionLabel(key, entries, packMeals) {
  const labels = uniqueSlotLabels(entries)
  const onlyGeneric = labels.length === 1 && isGenericExtraLabel(labels[0])
  if (labels.length === 1 && !onlyGeneric) return labels[0]
  if (key === 'start') {
    const firstMeal = packMeals[0]
    return firstMeal ? `Before ${formatSlotLabel(firstMeal)}` : labels.join(' · ')
  }
  if (key.startsWith('after:')) {
    return `After ${formatSlotLabel(key.slice('after:'.length))}`
  }
  return labels.join(' · ') || 'Daily'
}

function dogsFromEntries(entries) {
  const dogs = []
  for (const entry of entries ?? []) {
    const last = dogs[dogs.length - 1]
    if (last && last.dog.id === entry.dog.id) {
      last.rows.push(entry.row)
    } else {
      dogs.push({
        dog: entry.dog,
        rows: [entry.row],
        hasMenu: entry.hasMenu,
      })
    }
  }
  return dogs
}

function finalizeSlotSection({ id, slot, slotLabel, isMeal, entries }) {
  const dogs = dogsFromEntries(entries)
  const rows = dogs.flatMap((d) => d.rows)
  const checkable = rows.filter(isTodayCheckableRow)
  return {
    id,
    slot,
    slotLabel,
    isMeal,
    dogs,
    checkableCount: checkable.length,
    dueCount: checkable.filter((row) => !todayRowIsDone(row)).length,
    doneCount: checkable.filter((row) => todayRowIsDone(row)).length,
  }
}

/**
 * Transpose per-dog Today groups into slot sections.
 * Meal cards stay in day order; Daily / extras sit in the same gaps they
 * occupy in each dog’s By dog list (before breakfast, between meals, after
 * evening) instead of always collecting at the end.
 */
export function groupPackTodayBySlot(packGroups) {
  const mealSlots = new Set()
  for (const group of packGroups ?? []) {
    for (const row of group.rows ?? []) {
      if (row.type === 'meal') mealSlots.add(rowSlot(row))
    }
  }
  const packMeals = [...mealSlots].sort(
    (a, b) => slotSortKey(a) - slotSortKey(b),
  )

  const buckets = new Map()

  function ensure(id, meta) {
    if (!buckets.has(id)) buckets.set(id, { id, entries: [], ...meta })
    return buckets.get(id)
  }

  for (const group of packGroups ?? []) {
    const rows = group.rows ?? []
    let prevMeal = null
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      if (row.type === 'meal') {
        const slot = rowSlot(row)
        ensure(`meal:${slot}`, {
          slot,
          slotLabel: rowSlotLabel(row),
          isMeal: true,
        }).entries.push({ dog: group.dog, row, hasMenu: group.hasMenu })
        prevMeal = slot
        continue
      }
      const gapId = packGapKey(prevMeal, nextMealSlot(rows, i), packMeals)
      ensure(gapId, { isMeal: false }).entries.push({
        dog: group.dog,
        row,
        hasMenu: group.hasMenu,
      })
    }
  }

  const orderedIds = ['start']
  for (const meal of packMeals) {
    orderedIds.push(`meal:${meal}`, `after:${meal}`)
  }
  orderedIds.push('other')

  return orderedIds
    .map((id) => {
      const bucket = buckets.get(id)
      if (!bucket?.entries.length) return null
      if (bucket.isMeal) {
        return finalizeSlotSection(bucket)
      }
      return finalizeSlotSection({
        ...bucket,
        slot: rowSlot(bucket.entries[0].row),
        slotLabel: gapSectionLabel(id, bucket.entries, packMeals),
        isMeal: false,
      })
    })
    .filter(Boolean)
}

/** Incomplete Today rows for tracking dogs only (away dogs are skipped). */
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
  if (kind === 'activity') return 'Activity'
  if (kind === 'note') return 'Note'
  if (kind === 'fleamail') return 'Fleamail'
  return 'Food'
}
