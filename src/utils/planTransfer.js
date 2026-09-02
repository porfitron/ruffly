import { zlibSync, unzlibSync, strToU8, strFromU8 } from 'fflate'
import {
  DEFAULT_APP_DATA,
  pantryFromCatalog,
  pantryFoodToCatalogItem,
  createId,
} from './storage'
import { dogPresence, DOG_PRESENCE, isDogAway, uniqueDogSlug } from './dogs'
import { addLocalDays } from './todayCare'

function pantryForTransfer(state) {
  if (Array.isArray(state.pantry) && state.pantry.length > 0) return state.pantry
  return pantryFromCatalog(state.catalog)
}

export const PLAN_QR_PREFIX_V1 = 'ruffly1:'
export const PLAN_QR_PREFIX = 'ruffly2:'
/** Numbered chunks: ruffly3:{session}:{index}:{total}:{chunk} */
export const PLAN_QR_PREFIX_V3 = 'ruffly3:'
/** Byte-mode QR ~v8–v10 at ECC M — coarse enough for phone-to-phone. */
export const QR_CHUNK_CHARS = 240
/** Slow enough for html5-qrcode to lock onto each frame. */
export const QR_CYCLE_MS = 400
/** Care logs included in a QR export: today plus this many prior local days. */
export const QR_LOG_DAYS = 3
/** Compressed payload ceiling — enough for catalogs, menus, and care logs. */
export const MAX_PLAN_COMPRESSED_BYTES = 128 * 1024

function pickByDogId(byId, dogIds) {
  if (!byId || typeof byId !== 'object') return {}
  const next = {}
  for (const [dogId, value] of Object.entries(byId)) {
    if (dogIds.has(dogId)) next[dogId] = value
  }
  return next
}

/**
 * QR exports skip Away dogs (and their menus/logs) and keep only recent
 * care logs so phone-to-phone codes stay smaller / fewer frames.
 */
export function sliceStateForQr(state, now = new Date()) {
  const dogs = (state.dogs ?? []).filter((dog) => !isDogAway(dog))
  const dogIds = new Set(dogs.map((dog) => dog.id))
  const cutoff = addLocalDays(now, 1 - QR_LOG_DAYS)

  const logs = (state.logs ?? []).filter((log) => {
    if (log.dogId && !dogIds.has(log.dogId)) return false
    if (!log.loggedAt) return false
    const at = new Date(log.loggedAt)
    if (Number.isNaN(at.getTime())) return false
    return at.getTime() >= cutoff.getTime()
  })

  let activeDogId = state.activeDogId ?? null
  if (activeDogId && !dogIds.has(activeDogId)) {
    activeDogId = dogs[0]?.id ?? null
  }

  return {
    ...state,
    dogs,
    logs,
    activeDogId,
    menusByDogId: pickByDogId(state.menusByDogId, dogIds),
    mealPlansByDogId: pickByDogId(state.mealPlansByDogId, dogIds),
  }
}

function catalogItemsFromPlan(plan) {
  if (Array.isArray(plan.catalog) && plan.catalog.length > 0) {
    return plan.catalog.filter((item) => item?.id)
  }
  return pantryForTransfer(plan)
    .map((food) => pantryFoodToCatalogItem(food))
    .filter((item) => item?.id)
}

function collectMenuIds(menusByDogId) {
  const used = new Set()
  for (const items of Object.values(menusByDogId ?? {})) {
    for (const item of items ?? []) {
      if (item?.id) used.add(item.id)
    }
  }
  return used
}

function allocateId(prefix, used) {
  let id
  do {
    id = createId(prefix)
  } while (used.has(id))
  used.add(id)
  return id
}

function takeUniqueId(id, used, prefix) {
  if (id && !used.has(id)) {
    used.add(id)
    return id
  }
  return allocateId(prefix, used)
}

/**
 * Append incoming dogs (plus their menus, recent logs, and any new catalog
 * items) onto the current pack. Account details and existing dogs stay put.
 * Incoming dogs already on this device (same id) are skipped so a re-scan
 * does not duplicate them.
 */
export function mergePlanIntoState(current, incoming) {
  const currentDogs = current?.dogs ?? []
  const dogs = [...currentDogs]
  const existingDogIds = new Set(dogs.map((dog) => dog.id))
  const addedIds = new Set()

  for (const dog of incoming?.dogs ?? []) {
    if (!dog?.id || existingDogIds.has(dog.id)) continue
    const slug = uniqueDogSlug(dog.name, dogs, dog.id)
    dogs.push({ ...dog, slug })
    existingDogIds.add(dog.id)
    addedIds.add(dog.id)
  }

  const catalog = [...(current?.catalog ?? [])]
  const catalogIds = new Set(catalog.map((item) => item.id).filter(Boolean))
  for (const item of catalogItemsFromPlan(incoming ?? {})) {
    if (catalogIds.has(item.id)) continue
    catalog.push(item)
    catalogIds.add(item.id)
  }

  const menusByDogId = { ...(current?.menusByDogId ?? {}) }
  const usedMenuIds = collectMenuIds(menusByDogId)
  const menuIdMap = new Map()
  for (const [dogId, items] of Object.entries(incoming?.menusByDogId ?? {})) {
    if (!addedIds.has(dogId)) continue
    menusByDogId[dogId] = (items ?? []).map((item) => {
      const nextId = takeUniqueId(item?.id, usedMenuIds, 'menu')
      if (item?.id) menuIdMap.set(item.id, nextId)
      return { ...item, id: nextId }
    })
  }

  const mealPlansByDogId = { ...(current?.mealPlansByDogId ?? {}) }
  for (const [dogId, plan] of Object.entries(incoming?.mealPlansByDogId ?? {})) {
    if (!addedIds.has(dogId)) continue
    mealPlansByDogId[dogId] = plan ?? []
  }

  const usedLogIds = new Set(
    (current?.logs ?? []).map((log) => log.id).filter(Boolean),
  )
  const extraLogs = []
  for (const log of incoming?.logs ?? []) {
    if (!log?.dogId || !addedIds.has(log.dogId)) continue
    extraLogs.push({
      ...log,
      id: takeUniqueId(log.id, usedLogIds, 'log'),
      menuItemId: log.menuItemId
        ? (menuIdMap.get(log.menuItemId) ?? log.menuItemId)
        : log.menuItemId,
    })
  }

  const keepActive =
    current?.activeDogId &&
    dogs.some((dog) => dog.id === current.activeDogId)

  return {
    ...current,
    dogs,
    catalog,
    menusByDogId,
    mealPlansByDogId,
    logs: [...(current?.logs ?? []), ...extraLogs],
    activeDogId: keepActive ? current.activeDogId : (dogs[0]?.id ?? null),
    packOrder: 'manual',
  }
}

function trimCareInfo(careInfo) {
  if (!careInfo || typeof careInfo !== 'object') return null
  const next = {}
  for (const [key, value] of Object.entries(careInfo)) {
    if (typeof value === 'string' && value.trim()) next[key] = value.trim()
  }
  return Object.keys(next).length ? next : null
}

function compactText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function compactNoteGroup(source, keys) {
  if (!source || typeof source !== 'object') return null
  const next = {}
  for (const key of keys) {
    const text = compactText(source[key])
    if (text) next[key] = text
  }
  return Object.keys(next).length ? next : null
}

const FAVORITE_KEYS = ['foodTreat', 'toyGame', 'furiends']
const DISLIKE_KEYS = ['people', 'places', 'things']

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:')
}

function catalogForTransfer(state) {
  if (Array.isArray(state.catalog) && state.catalog.length > 0) {
    return state.catalog
  }
  return pantryForTransfer(state)
    .map((food) => pantryFoodToCatalogItem(food))
    .filter(Boolean)
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(encoded) {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function mealPlansToCompact(state) {
  const byDog = state.mealPlansByDogId
  if (byDog && typeof byDog === 'object' && Object.keys(byDog).length > 0) {
    return Object.entries(byDog).map(([dogId, plan]) => [
      dogId,
      (plan ?? []).map((item) => [item.foodId, item.percentage ?? 0]),
    ])
  }

  // Legacy single plan → wrap under active dog
  const legacy = state.currentMealPlan ?? []
  if (!legacy.length) return []
  const dogId = state.activeDogId ?? state.dogs?.[0]?.id
  if (!dogId) return []
  return [[dogId, legacy.map((item) => [item.foodId, item.percentage ?? 0])]]
}

function mealPlansFromCompact(compact, activeDogId) {
  // v3+: M = [[dogId, [[foodId, pct], ...]], ...]
  if (Array.isArray(compact.M)) {
    const mealPlansByDogId = {}
    for (const row of compact.M) {
      const dogId = row?.[0]
      if (!dogId) continue
      mealPlansByDogId[dogId] = (row[1] ?? []).map((item) => ({
        foodId: item[0],
        percentage: item[1] ?? 0,
      }))
    }
    return mealPlansByDogId
  }

  // v2: single m plan for active dog
  if (Array.isArray(compact.m)) {
    const dogId = activeDogId ?? compact.a ?? compact.d?.[0]?.[0]
    if (!dogId) return {}
    return {
      [dogId]: compact.m.map((row) => ({
        foodId: row[0],
        percentage: row[1] ?? 0,
      })),
    }
  }

  return {}
}

function catalogToRow(item) {
  const row = [
    item.id,
    item.kind ?? 'food',
    item.name ?? '',
    item.brand || null,
    compactText(item.notes),
    item.defaultAmount ?? null,
    item.unit || null,
    item.kcalPerUnit ?? null,
    item.productUrl || null,
  ]
  if ((item.kind ?? 'food') === 'food') {
    row.push(
      item.formula || null,
      item.flavor || null,
      item.category ?? 'kibble',
      item.kcalPerKg ?? null,
      item.kcalPerCup ?? null,
      item.kcalPerCan ?? null,
      item.proteinPercent ?? null,
      item.fatPercent ?? null,
    )
  }
  return row
}

function catalogFromRow(row) {
  if (!Array.isArray(row) || !row[0]) return null
  const kind = row[1] === 'med' || row[1] === 'supplement' ? row[1] : 'food'
  const item = {
    id: row[0],
    kind,
    name: row[2] ?? '',
    ...(row[3] ? { brand: row[3] } : {}),
    ...(row[4] ? { notes: row[4] } : {}),
    ...(row[5] != null ? { defaultAmount: row[5] } : {}),
    ...(row[6] ? { unit: row[6] } : {}),
    ...(row[7] != null ? { kcalPerUnit: row[7] } : {}),
    ...(row[8] ? { productUrl: row[8] } : {}),
  }
  if (kind === 'food') {
    return {
      ...item,
      name: row[9] || item.name,
      formula: row[9] || item.name,
      ...(row[10] ? { flavor: row[10] } : {}),
      category: row[11] ?? 'kibble',
      ...(row[12] != null ? { kcalPerKg: row[12] } : {}),
      ...(row[13] != null ? { kcalPerCup: row[13] } : {}),
      ...(row[14] != null ? { kcalPerCan: row[14] } : {}),
      ...(row[15] != null ? { proteinPercent: row[15] } : {}),
      ...(row[16] != null ? { fatPercent: row[16] } : {}),
    }
  }
  return item
}

function pantryFromRow(row) {
  return {
    id: row[0],
    name: row[1],
    ...(row[2] ? { brand: row[2] } : {}),
    category: row[3],
    ...(row[4] != null ? { kcalPerKg: row[4] } : {}),
    ...(row[5] != null ? { kcalPerCup: row[5] } : {}),
    ...(row[6] != null ? { kcalPerCan: row[6] } : {}),
    ...(row[7] ? { flavor: row[7] } : {}),
    ...(row[8] != null ? { proteinPercent: row[8] } : {}),
    ...(row[9] != null ? { fatPercent: row[9] } : {}),
    ...(row[10] ? { productUrl: row[10] } : {}),
  }
}

function dogToRow(dog, { includePhotos = true } = {}) {
  const photoUrl = compactText(dog.photoUrl)
  const includePhoto = includePhotos || !isDataUrl(photoUrl)
  const meds = Array.isArray(dog.medicationNeedIds)
    ? dog.medicationNeedIds.filter(Boolean)
    : []
  const onboarding = dog.onboarding && typeof dog.onboarding === 'object'
    ? dog.onboarding
    : null

  return [
    dog.id,
    dog.name ?? '',
    dog.weight ?? 0,
    dog.weightUnit ?? 'lbs',
    dog.goal ?? 'maintain',
    dog.goalIntensity ?? 'moderate',
    dog.activityLevel ?? 'neutered_adult',
    trimCareInfo(dog.careInfo),
    dog.primaryFood && typeof dog.primaryFood === 'object' ? dog.primaryFood : null,
    dog.calorieMode === 'manual' ? 'manual' : 'calculator',
    dog.calorieMode === 'manual' && Number(dog.manualTargetKcal) > 0
      ? Math.round(Number(dog.manualTargetKcal))
      : null,
    Number(dog.mealsPerDay) === 1 ? 1 : 2,
    dog.slug || null,
    includePhoto ? photoUrl : null,
    meds.length ? meds : null,
    compactText(dog.behaviorNotes),
    compactText(dog.licenseNumber),
    compactText(dog.vaccineInfo),
    compactText(dog.microchipId),
    onboarding
      ? [onboarding.basicsDone ? 1 : 0, onboarding.menuDone ? 1 : 0]
      : null,
    presenceToTransfer(dog),
    compactNoteGroup(dog.favorites, FAVORITE_KEYS),
    compactNoteGroup(dog.dislikes, DISLIKE_KEYS),
    dog.ageYears != null && Number.isFinite(Number(dog.ageYears))
      ? Number(dog.ageYears)
      : null,
    dog.gender === 'male' || dog.gender === 'female' ? dog.gender : null,
    compactText(dog.breed),
    compactText(dog.colors),
  ]
}

function presenceToTransfer(dog) {
  const presence = dogPresence(dog)
  if (presence === DOG_PRESENCE.away) return 1
  if (presence === DOG_PRESENCE.active) return 2
  return null
}

function presenceFromTransfer(value) {
  if (value === 1 || value === 'away') {
    return { presence: DOG_PRESENCE.away, away: true }
  }
  if (value === 2 || value === 'active') {
    return { presence: DOG_PRESENCE.active }
  }
  return {}
}

function dogFromRow(row) {
  return {
    id: row[0],
    name: row[1],
    weight: row[2],
    weightUnit: row[3],
    goal: row[4],
    goalIntensity: row[5],
    activityLevel: row[6],
    ...(row[7] ? { careInfo: row[7] } : {}),
    ...(row[8] ? { primaryFood: row[8] } : {}),
    calorieMode: row[9] === 'manual' ? 'manual' : 'calculator',
    ...(row[9] === 'manual' && row[10] != null
      ? { manualTargetKcal: Number(row[10]) }
      : {}),
    mealsPerDay: Number(row[11]) === 1 ? 1 : 2,
    ...(row[12] ? { slug: row[12] } : {}),
    ...(row[13] ? { photoUrl: row[13] } : {}),
    ...(Array.isArray(row[14]) && row[14].length
      ? { medicationNeedIds: row[14] }
      : {}),
    ...(row[15] ? { behaviorNotes: row[15] } : {}),
    ...(row[16] ? { licenseNumber: row[16] } : {}),
    ...(row[17] ? { vaccineInfo: row[17] } : {}),
    ...(row[18] ? { microchipId: row[18] } : {}),
    ...(Array.isArray(row[19])
      ? {
          onboarding: {
            basicsDone: row[19][0] === 1,
            menuDone: row[19][1] === 1,
          },
        }
      : {}),
    ...presenceFromTransfer(row[20]),
    ...(row[21] && typeof row[21] === 'object' ? { favorites: row[21] } : {}),
    ...(row[22] && typeof row[22] === 'object' ? { dislikes: row[22] } : {}),
    ...(row[23] != null && Number.isFinite(Number(row[23]))
      ? { ageYears: Number(row[23]) }
      : {}),
    ...(row[24] === 'male' || row[24] === 'female' || row[24] === 'unknown'
      ? { gender: row[24] }
      : {}),
    ...(row[25] ? { breed: row[25] } : {}),
    ...(row[26] ? { colors: row[26] } : {}),
  }
}

function menusToCompact(state) {
  const byDog = state.menusByDogId
  if (!byDog || typeof byDog !== 'object') return []
  return Object.entries(byDog)
    .map(([dogId, items]) => [
      dogId,
      (items ?? []).map((item) => [
        item.id,
        item.careItemId,
        item.slot ?? 'daily',
        item.amount ?? null,
        item.unit || null,
        item.legacyPercentage ?? item.percentage ?? null,
      ]),
    ])
    .filter((row) => row[1].length > 0)
}

function menusFromCompact(compact) {
  if (!Array.isArray(compact.u)) return {}
  const menusByDogId = {}
  for (const row of compact.u) {
    const dogId = row?.[0]
    if (!dogId) continue
    menusByDogId[dogId] = (row[1] ?? []).map((item) => ({
      id: item[0],
      careItemId: item[1],
      slot: item[2] ?? 'daily',
      ...(item[3] != null ? { amount: item[3] } : {}),
      ...(item[4] ? { unit: item[4] } : {}),
      ...(item[5] != null ? { legacyPercentage: item[5] } : {}),
    }))
  }
  return menusByDogId
}

function logsToCompact(state) {
  return (state.logs ?? []).map((log) => [
    log.id,
    log.dogId ?? null,
    log.careItemId ?? null,
    log.kind ?? 'food',
    log.amount ?? null,
    log.unit || null,
    log.kcal ?? null,
    log.loggedAt ?? null,
    compactText(log.note),
    log.menuItemId ?? null,
    compactText(log.label),
  ])
}

function logsFromCompact(compact) {
  if (!Array.isArray(compact.L)) return []
  return compact.L.map((row) => ({
    id: row[0],
    dogId: row[1],
    careItemId: row[2],
    kind: row[3] ?? 'food',
    amount: row[4],
    unit: row[5],
    kcal: row[6],
    loggedAt: row[7],
    ...(row[8] ? { note: row[8] } : {}),
    ...(row[9] ? { menuItemId: row[9] } : {}),
    ...(row[10] ? { label: row[10] } : {}),
  }))
}

function ownerToCompact(state, { includePhotos = true } = {}) {
  const account = state.ownerAccount
  if (!account || typeof account !== 'object') return null
  const name = compactText(account.name)
  const phone = compactText(account.phone)
  const email = compactText(account.email)
  const photoUrl = compactText(account.photoUrl)
  const includePhoto = includePhotos || !isDataUrl(photoUrl)
  if (!name && !phone && !email && !(includePhoto && photoUrl)) return null
  return [name, phone, email, includePhoto ? photoUrl : null]
}

function ownerFromCompact(compact) {
  if (!Array.isArray(compact.o)) return { ...DEFAULT_APP_DATA.ownerAccount }
  return {
    name: compact.o[0] ?? '',
    phone: compact.o[1] ?? '',
    email: compact.o[2] ?? '',
    ...(compact.o[3] ? { photoUrl: compact.o[3] } : {}),
  }
}

function teaserToCompact(state) {
  const teaser = state.proTeaser
  if (!teaser || typeof teaser !== 'object') return null
  if (!teaser.hasClickedAddDog && !compactText(teaser.userEmail)) return null
  return [teaser.hasClickedAddDog ? 1 : 0, compactText(teaser.userEmail)]
}

function teaserFromCompact(compact) {
  if (!Array.isArray(compact.g)) return { ...DEFAULT_APP_DATA.proTeaser }
  return {
    hasClickedAddDog: compact.g[0] === 1,
    userEmail: compact.g[1] ?? null,
  }
}

/** Compact array form — shorter than verbose JSON keys. */
function toCompact(state, { includePhotos = true } = {}) {
  const catalog = catalogForTransfer(state)
  const pantry = pantryFromCatalog(catalog)
  const foods = pantry.length > 0 ? pantry : pantryForTransfer(state)
  const owner = ownerToCompact(state, { includePhotos })
  const teaser = teaserToCompact(state)
  const menus = menusToCompact(state)
  const logs = logsToCompact(state)

  return {
    v: 4,
    a: state.activeDogId ?? null,
    d: (state.dogs ?? []).map((dog) => dogToRow(dog, { includePhotos })),
    p: foods.map((food) => [
      food.id,
      food.name ?? '',
      food.brand || null,
      food.category ?? 'kibble',
      food.kcalPerKg ?? null,
      food.kcalPerCup ?? null,
      food.kcalPerCan ?? null,
      food.flavor || null,
      food.proteinPercent ?? null,
      food.fatPercent ?? null,
      food.productUrl || null,
    ]),
    c: catalog.map(catalogToRow),
    M: mealPlansToCompact(state),
    ...(menus.length ? { u: menus } : {}),
    ...(logs.length ? { L: logs } : {}),
    t: [
      state.tripSettings?.days ?? DEFAULT_APP_DATA.tripSettings.days,
      state.tripSettings?.bufferMode ?? DEFAULT_APP_DATA.tripSettings.bufferMode,
    ],
    ...(owner ? { o: owner } : {}),
    ...(teaser ? { g: teaser } : {}),
  }
}

function isFullSnapshot(compact) {
  return (
    Number(compact.v) >= 4 ||
    Array.isArray(compact.c) ||
    Array.isArray(compact.u) ||
    Array.isArray(compact.L)
  )
}

function fromCompact(compact) {
  if (!compact || typeof compact !== 'object') {
    throw new Error('That does not look like a valid Ruffly plan.')
  }

  if (isFullSnapshot(compact) && Array.isArray(compact.d)) {
    const activeDogId = compact.a ?? compact.d[0]?.[0] ?? null
    const catalog = Array.isArray(compact.c)
      ? compact.c.map(catalogFromRow).filter(Boolean)
      : []
    const pantry = Array.isArray(compact.p)
      ? compact.p.map(pantryFromRow)
      : pantryFromCatalog(catalog)
    return {
      ...structuredClone(DEFAULT_APP_DATA),
      activeDogId,
      dogs: compact.d.map(dogFromRow),
      catalog: catalog.length > 0 ? catalog : pantry.map(pantryFoodToCatalogItem).filter(Boolean),
      pantry,
      mealPlansByDogId: mealPlansFromCompact(compact, activeDogId),
      menusByDogId: menusFromCompact(compact),
      logs: logsFromCompact(compact),
      tripSettings: {
        days: compact.t?.[0] ?? DEFAULT_APP_DATA.tripSettings.days,
        bufferMode: compact.t?.[1] ?? DEFAULT_APP_DATA.tripSettings.bufferMode,
      },
      ownerAccount: ownerFromCompact(compact),
      proTeaser: teaserFromCompact(compact),
    }
  }

  if (Array.isArray(compact.d) && Array.isArray(compact.p)) {
    const activeDogId = compact.a ?? compact.d[0]?.[0] ?? null
    return {
      ...structuredClone(DEFAULT_APP_DATA),
      activeDogId,
      dogs: compact.d.map(dogFromRow),
      pantry: compact.p.map(pantryFromRow),
      mealPlansByDogId: mealPlansFromCompact(compact, activeDogId),
      tripSettings: {
        days: compact.t?.[0] ?? DEFAULT_APP_DATA.tripSettings.days,
        bufferMode: compact.t?.[1] ?? DEFAULT_APP_DATA.tripSettings.bufferMode,
      },
    }
  }

  // Verbose v1 JSON body
  if (!Array.isArray(compact.dogs) || !Array.isArray(compact.pantry)) {
    throw new Error('That plan is missing dog or pantry data.')
  }

  const activeDogId = compact.activeDogId ?? compact.dogs[0]?.id ?? null
  let mealPlansByDogId =
    compact.mealPlansByDogId && typeof compact.mealPlansByDogId === 'object'
      ? compact.mealPlansByDogId
      : {}
  if (
    Object.keys(mealPlansByDogId).length === 0 &&
    Array.isArray(compact.currentMealPlan) &&
    activeDogId
  ) {
    mealPlansByDogId = { [activeDogId]: compact.currentMealPlan }
  }

  return {
    ...structuredClone(DEFAULT_APP_DATA),
    activeDogId,
    dogs: compact.dogs,
    pantry: compact.pantry,
    ...(Array.isArray(compact.catalog) ? { catalog: compact.catalog } : {}),
    ...(compact.menusByDogId && typeof compact.menusByDogId === 'object'
      ? { menusByDogId: compact.menusByDogId }
      : {}),
    ...(Array.isArray(compact.logs) ? { logs: compact.logs } : {}),
    ...(compact.ownerAccount && typeof compact.ownerAccount === 'object'
      ? { ownerAccount: compact.ownerAccount }
      : {}),
    mealPlansByDogId,
    tripSettings: {
      ...DEFAULT_APP_DATA.tripSettings,
      ...(compact.tripSettings ?? {}),
    },
  }
}

export function buildPlanPayload(state) {
  return fromCompact(toCompact(state))
}

function compressPlan(state, { includePhotos = true } = {}) {
  const compact = toCompact(state, { includePhotos })
  return zlibSync(strToU8(JSON.stringify(compact)), { level: 9 })
}

export function encodePlanForQr(state) {
  return encodePlanSnapshot(state).payload
}

function encodePlanSnapshot(state) {
  const sliced = sliceStateForQr(state)
  if ((sliced.dogs ?? []).length === 0) {
    throw new Error(
      'No tracking or active dogs to share. Set a dog to Tracking or Active first.',
    )
  }
  const omittedPhotos =
    sliced.dogs.some((dog) => isDataUrl(dog.photoUrl)) ||
    isDataUrl(sliced.ownerAccount?.photoUrl)
  // JPEG data URLs barely compress and dominate QR frame count — leave them off.
  const compressed = compressPlan(sliced, { includePhotos: false })
  if (compressed.byteLength > MAX_PLAN_COMPRESSED_BYTES) {
    throw new Error(
      'This plan is too large to share. Try removing catalog items you don’t need.',
    )
  }
  return {
    payload: `${PLAN_QR_PREFIX}${bytesToBase64Url(compressed)}`,
    omittedPhotos,
  }
}

function splitChunks(value, size) {
  if (!value) return ['']
  const chunks = []
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size))
  }
  return chunks
}

function newFrameSession() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 8)
}

/**
 * One or more QR payloads for Share Plan.
 * Small plans stay a single ruffly2 code (older receivers still work).
 * Larger plans become a looping ruffly3 chunk sequence.
 */
export function encodePlanFrames(state) {
  const { payload, omittedPhotos } = encodePlanSnapshot(state)
  const body = payload.slice(PLAN_QR_PREFIX.length)
  const chunks = splitChunks(body, QR_CHUNK_CHARS)
  if (chunks.length <= 1) {
    return { frames: [payload], count: 1, session: null, omittedPhotos }
  }

  const session = newFrameSession()
  const total = chunks.length
  const frames = chunks.map(
    (chunk, index) =>
      `${PLAN_QR_PREFIX_V3}${session}:${index}:${total}:${chunk}`,
  )
  return { frames, count: total, session, omittedPhotos }
}

function parseChunkFrame(raw) {
  if (!raw.startsWith(PLAN_QR_PREFIX_V3)) return null
  const rest = raw.slice(PLAN_QR_PREFIX_V3.length)
  const sessionEnd = rest.indexOf(':')
  const indexEnd = rest.indexOf(':', sessionEnd + 1)
  const totalEnd = rest.indexOf(':', indexEnd + 1)
  if (sessionEnd < 1 || indexEnd < 0 || totalEnd < 0) return null

  const session = rest.slice(0, sessionEnd)
  const index = Number(rest.slice(sessionEnd + 1, indexEnd))
  const total = Number(rest.slice(indexEnd + 1, totalEnd))
  const chunk = rest.slice(totalEnd + 1)

  if (!/^[A-Za-z0-9]+$/.test(session)) return null
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null
  if (total < 2 || index < 0 || index >= total) return null
  if (!chunk) return null

  return { session, index, total, chunk }
}

function isLegacyPlanQr(raw) {
  return (
    raw.startsWith(PLAN_QR_PREFIX) ||
    raw.startsWith(PLAN_QR_PREFIX_V1) ||
    raw.startsWith('ruffly1.') ||
    raw.startsWith('{')
  )
}

/** Collects ruffly3 chunks (and still accepts a single ruffly2/v1 code). */
export function createPlanChunkCollector() {
  let session = null
  let total = 0
  const parts = new Map()

  function resetSession(nextSession, nextTotal) {
    session = nextSession
    total = nextTotal
    parts.clear()
  }

  return {
    reset() {
      resetSession(null, 0)
    },
    add(raw) {
      const trimmed = String(raw ?? '').trim()
      if (!trimmed) return { status: 'ignore' }

      if (!trimmed.startsWith(PLAN_QR_PREFIX_V3)) {
        if (!isLegacyPlanQr(trimmed)) return { status: 'ignore' }
        try {
          return { status: 'complete', plan: decodePlan(trimmed) }
        } catch (err) {
          return {
            status: 'error',
            error: err.message || 'That QR code is not a Ruffly plan.',
          }
        }
      }

      const frame = parseChunkFrame(trimmed)
      if (!frame) {
        return {
          status: 'error',
          error: 'That QR code is not a Ruffly plan.',
        }
      }

      if (frame.session !== session || frame.total !== total) {
        resetSession(frame.session, frame.total)
      }
      parts.set(frame.index, frame.chunk)
      const got = parts.size
      if (got !== total) {
        return { status: 'collecting', got, total }
      }

      const body = Array.from({ length: total }, (_, i) => parts.get(i) ?? '').join(
        '',
      )
      try {
        const plan = decodePlan(`${PLAN_QR_PREFIX}${body}`)
        return { status: 'complete', plan, got, total }
      } catch (err) {
        resetSession(null, 0)
        return {
          status: 'error',
          error: err.message || 'Could not read that plan.',
        }
      }
    },
  }
}

export function summarizePlan(plan) {
  const dogs = plan.dogs ?? []
  const pantry = pantryForTransfer(plan)
  const catalog = Array.isArray(plan.catalog) ? plan.catalog : pantry
  const byDog = plan.mealPlansByDogId ?? {}
  const mealItemCount = Object.values(byDog).reduce(
    (sum, planItems) => sum + (planItems?.length ?? 0),
    0,
  )
  const menuItemCount = Object.values(plan.menusByDogId ?? {}).reduce(
    (sum, items) => sum + (items?.length ?? 0),
    0,
  )
  const owner = plan.ownerAccount
  const hasOwner = Boolean(
    owner &&
      [owner.name, owner.phone, owner.email].some(
        (value) => typeof value === 'string' && value.trim(),
      ),
  )
  const dogNames = dogs.map((d) => d.name || 'Unnamed').filter(Boolean)
  return {
    dogCount: dogs.length,
    dogNames,
    pantryCount: pantry.length,
    catalogCount: catalog.length,
    mealItemCount,
    menuItemCount,
    logCount: (plan.logs ?? []).length,
    hasOwner,
  }
}

export function decodePlan(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('No plan data found.')

  let parsed
  if (trimmed.startsWith(PLAN_QR_PREFIX)) {
    const bytes = base64UrlToBytes(trimmed.slice(PLAN_QR_PREFIX.length))
    parsed = JSON.parse(strFromU8(unzlibSync(bytes)))
  } else if (trimmed.startsWith(PLAN_QR_PREFIX_V1)) {
    parsed = JSON.parse(trimmed.slice(PLAN_QR_PREFIX_V1.length))
  } else if (trimmed.startsWith('ruffly1.')) {
    const binary = atob(trimmed.slice('ruffly1.'.length))
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } else {
    parsed = JSON.parse(trimmed)
  }

  return fromCompact(parsed)
}
