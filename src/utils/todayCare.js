/** Calendar day helpers + “what’s due today” from menus vs logs. */

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

/**
 * Build today’s care rows for one dog.
 * Menu items are due once per local day (as_needed only if not yet logged today).
 */
export function buildDogTodayTasks(dog, menuItems, catalog, logs, day = new Date()) {
  const byId = catalogById(catalog)
  const todayLogs = logsForDogOnDay(logs, dog.id, day)

  const tasks = []
  for (const menuItem of menuItems ?? []) {
    const careItem = byId.get(menuItem.careItemId)
    if (!careItem) continue

    const slot = menuItem.slot ?? 'daily'
    const doneLog = todayLogs.find(
      (log) =>
        log.menuItemId === menuItem.id ||
        (log.careItemId === menuItem.careItemId && log.kind === careItem.kind),
    )

    if (slot === 'as_needed' && doneLog) continue

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
      targetDER: dog.targetDER ?? null,
    })
  }

  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return slotSortKey(a.slot) - slotSortKey(b.slot)
  })

  return tasks
}

export function buildPackTodayTasks(dogs, menusByDogId, catalog, logs, day = new Date()) {
  const groups = []
  for (const dog of dogs ?? []) {
    const menu = menusByDogId?.[dog.id] ?? []
    const tasks = buildDogTodayTasks(dog, menu, catalog, logs, day)
    const kcalLogged = foodKcalLoggedToday(logs, dog.id, day)
    groups.push({
      dog,
      tasks,
      dueCount: tasks.filter((t) => !t.done).length,
      doneCount: tasks.filter((t) => t.done).length,
      kcalLogged,
      targetDER: dog.targetDER ?? null,
      hasMenu: menu.length > 0,
    })
  }
  // Dogs with due work first, then by name
  groups.sort((a, b) => {
    if (a.dueCount !== b.dueCount) return b.dueCount - a.dueCount
    return (a.dog.name || '').localeCompare(b.dog.name || '', undefined, {
      sensitivity: 'base',
    })
  })
  return groups
}

export function kindLabel(kind) {
  if (kind === 'med') return 'Med'
  if (kind === 'supplement') return 'Supplement'
  if (kind === 'weight') return 'Weight'
  return 'Food'
}
