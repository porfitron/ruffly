import { uniqueDogSlug } from './dogs'

const STORAGE_KEY = 'ruffly_app_data_v1'

export const EMPTY_OWNER_ACCOUNT = {
  name: '',
  phone: '',
  email: '',
}

export const CARE_ITEM_KINDS = ['food', 'med', 'supplement']
export const LOG_KINDS = ['food', 'med', 'supplement', 'weight']

export const DEFAULT_APP_DATA = {
  activeDogId: null,
  dogs: [],
  catalog: [],
  menusByDogId: {},
  logs: [],
  // Legacy bowl mix — kept in sync for current UI / QR transfer until bowl migrates off.
  mealPlansByDogId: {},
  tripSettings: {
    days: 3,
    bufferMode: 'plus1',
  },
  ownerAccount: { ...EMPTY_OWNER_ACCOUNT },
  proTeaser: {
    hasClickedAddDog: false,
    userEmail: null,
  },
}

export const EMPTY_CARE_INFO = {
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  emergencyName: '',
  emergencyPhone: '',
  vetName: '',
  vetPhone: '',
  notes: '',
}

/** Completable profile fields (post-onboarding). Not required for Today / logging. */
export const EMPTY_DOG_PROFILE_DETAILS = {
  medicationNeedIds: [],
  behaviorNotes: '',
  licenseNumber: '',
  vaccineInfo: '',
  microchipId: '',
}

export const EMPTY_DOG_ONBOARDING = {
  basicsDone: false,
  menuDone: false,
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function normalizeMedicationNeedIds(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(Boolean).map(String))]
}

export function normalizeDogRecord(dog, { menuDoneHint } = {}) {
  if (!dog || typeof dog !== 'object') return dog
  const onboarding = {
    ...EMPTY_DOG_ONBOARDING,
    ...(dog.onboarding && typeof dog.onboarding === 'object' ? dog.onboarding : {}),
  }
  // Infer basicsDone when the dog already has a name + weight from older data.
  if (!dog.onboarding && dog.name && Number(dog.weight) > 0) {
    onboarding.basicsDone = true
  }
  if (menuDoneHint && !dog.onboarding?.menuDone) {
    onboarding.menuDone = true
  }

  return {
    ...dog,
    onboarding,
    medicationNeedIds: normalizeMedicationNeedIds(dog.medicationNeedIds),
    behaviorNotes: dog.behaviorNotes ?? '',
    licenseNumber: dog.licenseNumber ?? '',
    vaccineInfo: dog.vaccineInfo ?? '',
    microchipId: dog.microchipId ?? '',
    careInfo: { ...EMPTY_CARE_INFO, ...(dog.careInfo ?? {}) },
  }
}

/** Profile completeness helpers for UI checklists (not gates). */
export function getDogProfileCompletion(dog) {
  const meds = dog?.medicationNeedIds?.length > 0
  const behavior = Boolean(dog?.behaviorNotes?.trim())
  const license = Boolean(dog?.licenseNumber?.trim())
  const vaccines = Boolean(dog?.vaccineInfo?.trim())
  const microchip = Boolean(dog?.microchipId?.trim())
  const fields = [
    { key: 'medicationNeeds', label: 'Medication needs', done: meds },
    { key: 'behaviorNotes', label: 'Behavior notes', done: behavior },
    { key: 'licenseNumber', label: 'License number', done: license },
    { key: 'vaccineInfo', label: 'Vaccine info', done: vaccines },
    { key: 'microchipId', label: 'Microchip ID', done: microchip },
  ]
  const doneCount = fields.filter((f) => f.done).length
  return {
    fields,
    doneCount,
    total: fields.length,
    isComplete: doneCount === fields.length,
    basicsDone: Boolean(dog?.onboarding?.basicsDone),
    menuDone: Boolean(dog?.onboarding?.menuDone),
  }
}

function ensureDogSlugs(dogs) {
  if (!Array.isArray(dogs)) return []
  const withSlugs = []
  for (const dog of dogs) {
    const slug =
      dog.slug && String(dog.slug).trim()
        ? dog.slug
        : uniqueDogSlug(dog.name, withSlugs, dog.id)
    withSlugs.push({ ...dog, slug })
  }
  return withSlugs
}

/** Map a legacy pantry food into a catalog care item (preserves density fields). */
export function pantryFoodToCatalogItem(food) {
  if (!food || typeof food !== 'object') return null
  const id = food.id || createId('item')
  const formula = food.formula ?? food.name ?? ''
  return {
    id,
    kind: 'food',
    name: formula,
    formula,
    brand: food.brand ?? '',
    flavor: food.flavor ?? '',
    notes: food.notes ?? '',
    category: food.category ?? 'kibble',
    defaultAmount: food.defaultAmount ?? null,
    unit: food.unit ?? 'g',
    kcalPerUnit: food.kcalPerUnit ?? null,
    kcalPerKg: food.kcalPerKg ?? null,
    kcalPerCup: food.kcalPerCup ?? null,
    kcalPerCan: food.kcalPerCan ?? null,
    productUrl: food.productUrl ?? '',
    ...(food.proteinPercent != null ? { proteinPercent: food.proteinPercent } : {}),
    ...(food.fatPercent != null ? { fatPercent: food.fatPercent } : {}),
  }
}

/** Map a food catalog item back to the pantry shape older UI expects. */
export function catalogItemToPantryFood(item) {
  if (!item || item.kind !== 'food') return null
  const formula = item.formula ?? item.name ?? ''
  return {
    id: item.id,
    name: formula,
    formula,
    brand: item.brand ?? '',
    flavor: item.flavor ?? '',
    category: item.category ?? 'kibble',
    kcalPerKg: item.kcalPerKg ?? null,
    kcalPerCup: item.kcalPerCup ?? null,
    kcalPerCan: item.kcalPerCan ?? null,
    productUrl: item.productUrl ?? '',
    ...(item.proteinPercent != null ? { proteinPercent: item.proteinPercent } : {}),
    ...(item.fatPercent != null ? { fatPercent: item.fatPercent } : {}),
    ...(item.defaultAmount != null ? { defaultAmount: item.defaultAmount } : {}),
    ...(item.unit ? { unit: item.unit } : {}),
    ...(item.kcalPerUnit != null ? { kcalPerUnit: item.kcalPerUnit } : {}),
    ...(item.notes ? { notes: item.notes } : {}),
  }
}

export function pantryFromCatalog(catalog) {
  return (catalog ?? [])
    .map(catalogItemToPantryFood)
    .filter(Boolean)
}

function normalizeCareItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const kind = CARE_ITEM_KINDS.includes(raw.kind) ? raw.kind : 'food'
  const base = {
    id: raw.id || createId('item'),
    kind,
    name: raw.name ?? '',
    brand: raw.brand ?? '',
    notes: raw.notes ?? '',
    defaultAmount: raw.defaultAmount ?? null,
    unit: raw.unit ?? (kind === 'food' ? 'g' : 'unit'),
    kcalPerUnit: raw.kcalPerUnit ?? null,
    productUrl: raw.productUrl ?? '',
  }
  if (kind === 'food') {
    const formula = raw.formula ?? raw.name ?? ''
    return {
      ...base,
      name: formula || base.name,
      formula,
      flavor: raw.flavor ?? '',
      category: raw.category ?? 'kibble',
      kcalPerKg: raw.kcalPerKg ?? null,
      kcalPerCup: raw.kcalPerCup ?? null,
      kcalPerCan: raw.kcalPerCan ?? null,
      ...(raw.proteinPercent != null ? { proteinPercent: raw.proteinPercent } : {}),
      ...(raw.fatPercent != null ? { fatPercent: raw.fatPercent } : {}),
    }
  }
  return base
}

function normalizeLog(raw) {
  if (!raw || typeof raw !== 'object') return null
  const kind = LOG_KINDS.includes(raw.kind) ? raw.kind : 'food'
  return {
    id: raw.id || createId('log'),
    dogId: raw.dogId ?? null,
    careItemId: raw.careItemId ?? null,
    kind,
    amount: raw.amount ?? null,
    unit: raw.unit ?? null,
    kcal: raw.kcal ?? null,
    loggedAt: raw.loggedAt || new Date().toISOString(),
    note: raw.note ?? '',
    menuItemId: raw.menuItemId ?? null,
  }
}

function normalizeMenuItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const careItemId = raw.careItemId ?? raw.foodId ?? null
  if (!careItemId) return null
  return {
    id: raw.id || createId('menu'),
    careItemId,
    slot: raw.slot ?? 'daily',
    amount: raw.amount ?? null,
    unit: raw.unit ?? null,
    ...(raw.legacyPercentage != null
      ? { legacyPercentage: Number(raw.legacyPercentage) || 0 }
      : raw.percentage != null
        ? { legacyPercentage: Number(raw.percentage) || 0 }
        : {}),
  }
}

/** Meal-plan row ↔ menu item (bowl % mix compatibility). */
export function mealPlanToMenuItems(plan) {
  if (!Array.isArray(plan)) return []
  return plan
    .map((item) =>
      normalizeMenuItem({
        careItemId: item.foodId,
        slot: 'daily',
        legacyPercentage: item.percentage ?? 0,
        id: item.menuItemId,
      }),
    )
    .filter(Boolean)
}

export function menuItemsToMealPlan(menuItems) {
  if (!Array.isArray(menuItems)) return []
  return menuItems
    .filter((item) => item?.careItemId)
    .filter(
      (item) =>
        item.legacyPercentage != null ||
        item.slot === 'daily' ||
        item.slot == null,
    )
    .map((item) => ({
      foodId: item.careItemId,
      percentage: Number(item.legacyPercentage) || 0,
    }))
}

function mergeCatalogFromPantry(catalog, pantry, dogs) {
  const byId = new Map()
  for (const item of catalog) {
    const normalized = normalizeCareItem(item)
    if (normalized) byId.set(normalized.id, normalized)
  }

  for (const food of pantry ?? []) {
    const mapped = pantryFoodToCatalogItem(food)
    if (!mapped) continue
    if (!byId.has(mapped.id)) {
      byId.set(mapped.id, mapped)
    } else {
      // Prefer existing catalog row; fill missing density fields from pantry.
      const existing = byId.get(mapped.id)
      byId.set(mapped.id, {
        ...mapped,
        ...existing,
        kcalPerKg: existing.kcalPerKg ?? mapped.kcalPerKg,
        kcalPerCup: existing.kcalPerCup ?? mapped.kcalPerCup,
        kcalPerCan: existing.kcalPerCan ?? mapped.kcalPerCan,
        productUrl: existing.productUrl || mapped.productUrl,
        brand: existing.brand || mapped.brand,
      })
    }
  }

  // Dogs with primaryFood but no catalog entry → upsert a food item.
  for (const dog of dogs ?? []) {
    const primary = dog.primaryFood
    if (!primary || typeof primary !== 'object') continue
    const name = primary.name?.trim()
    if (!name) continue
    const already = [...byId.values()].some(
      (item) =>
        item.kind === 'food' &&
        item.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (already) continue
    const mapped = pantryFoodToCatalogItem({
      id: createId('item'),
      name,
      brand: primary.brand ?? '',
      category: primary.category ?? 'kibble',
      kcalPerKg: primary.kcalPerKg ?? null,
      kcalPerCup: primary.kcalPerCup ?? null,
      kcalPerCan: primary.kcalPerCan ?? null,
      productUrl: primary.productUrl ?? '',
    })
    if (mapped) byId.set(mapped.id, mapped)
  }

  return [...byId.values()]
}

function migrateMenus(menusByDogId, mealPlansByDogId, dogIds) {
  const menus = {}
  const mealPlans = { ...(mealPlansByDogId ?? {}) }

  for (const dogId of dogIds) {
    const existingMenu = Array.isArray(menusByDogId?.[dogId])
      ? menusByDogId[dogId].map(normalizeMenuItem).filter(Boolean)
      : []
    const plan = Array.isArray(mealPlans[dogId]) ? mealPlans[dogId] : []

    if (existingMenu.length > 0) {
      menus[dogId] = existingMenu
      // Ensure meal plan exists for bowl UI when menu only has legacy %.
      if (plan.length === 0) {
        const derived = menuItemsToMealPlan(existingMenu)
        if (derived.length > 0) mealPlans[dogId] = derived
      }
      continue
    }

    if (plan.length > 0) {
      menus[dogId] = mealPlanToMenuItems(plan)
    } else {
      menus[dogId] = []
    }
  }

  // Preserve menus for unknown keys (orphaned) lightly
  for (const [dogId, items] of Object.entries(menusByDogId ?? {})) {
    if (menus[dogId]) continue
    menus[dogId] = (items ?? []).map(normalizeMenuItem).filter(Boolean)
  }

  return { menusByDogId: menus, mealPlansByDogId: mealPlans }
}

/**
 * Normalize + migrate any stored payload to the care-logging schema.
 * Catalog is source of truth for care items; pantry is derived for legacy UI.
 */
export function normalizeAppData(raw) {
  const base = structuredClone(DEFAULT_APP_DATA)
  const parsed = raw && typeof raw === 'object' ? raw : {}
  const dogs = ensureDogSlugs(parsed.dogs ?? [])
  const activeDogId =
    parsed.activeDogId && dogs.some((d) => d.id === parsed.activeDogId)
      ? parsed.activeDogId
      : (dogs[0]?.id ?? null)

  let mealPlansByDogId = {
    ...(parsed.mealPlansByDogId && typeof parsed.mealPlansByDogId === 'object'
      ? parsed.mealPlansByDogId
      : {}),
  }

  // Legacy single bowl plan → active dog's plan
  if (
    Array.isArray(parsed.currentMealPlan) &&
    parsed.currentMealPlan.length > 0 &&
    activeDogId &&
    !Array.isArray(mealPlansByDogId[activeDogId])
  ) {
    mealPlansByDogId = {
      ...mealPlansByDogId,
      [activeDogId]: parsed.currentMealPlan,
    }
  }

  const catalog = mergeCatalogFromPantry(
    Array.isArray(parsed.catalog) ? parsed.catalog : [],
    Array.isArray(parsed.pantry) ? parsed.pantry : [],
    dogs,
  )

  const dogIds = dogs.map((d) => d.id)
  // Ensure every dog has meal-plan + menu buckets
  for (const id of dogIds) {
    if (!Array.isArray(mealPlansByDogId[id])) mealPlansByDogId[id] = []
  }

  const migrated = migrateMenus(
    parsed.menusByDogId && typeof parsed.menusByDogId === 'object'
      ? parsed.menusByDogId
      : {},
    mealPlansByDogId,
    dogIds,
  )

  const logs = Array.isArray(parsed.logs)
    ? parsed.logs.map(normalizeLog).filter(Boolean)
    : []

  const normalizedDogs = dogs.map((dog) =>
    normalizeDogRecord(dog, {
      menuDoneHint: (migrated.menusByDogId[dog.id] ?? []).length > 0,
    }),
  )

  const {
    currentMealPlan: _legacyMealPlan,
    pantry: _legacyPantry,
    ...parsedWithoutLegacy
  } = parsed

  return {
    ...base,
    ...parsedWithoutLegacy,
    dogs: normalizedDogs,
    activeDogId,
    catalog,
    menusByDogId: migrated.menusByDogId,
    mealPlansByDogId: migrated.mealPlansByDogId,
    logs,
    // Derived for callers that still read pantry off state (QR, older components).
    pantry: pantryFromCatalog(catalog),
    tripSettings: {
      ...base.tripSettings,
      ...(parsed.tripSettings ?? {}),
    },
    ownerAccount: {
      ...EMPTY_OWNER_ACCOUNT,
      ...(parsed.ownerAccount ?? {}),
    },
    proTeaser: {
      ...base.proTeaser,
      ...(parsed.proTeaser ?? {}),
    },
  }
}

export function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_APP_DATA)
    return normalizeAppData(JSON.parse(raw))
  } catch {
    return structuredClone(DEFAULT_APP_DATA)
  }
}

export function saveAppData(data) {
  const {
    currentMealPlan: _legacyMeal,
    pantry: _derivedPantry,
    ...persistable
  } = data
  // Persist catalog as source of truth; pantry is re-derived on load.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Upsert a care item into a catalog array (immutable). */
export function upsertCatalogItem(catalog, item) {
  const normalized = normalizeCareItem(item)
  if (!normalized) return catalog ?? []
  const list = catalog ?? []
  const exists = list.some((c) => c.id === normalized.id)
  return exists
    ? list.map((c) => (c.id === normalized.id ? { ...c, ...normalized } : c))
    : [...list, normalized]
}

export function stripCareItemReferences(state, careItemId) {
  const menusByDogId = {}
  for (const [dogId, items] of Object.entries(state.menusByDogId ?? {})) {
    menusByDogId[dogId] = (items ?? []).filter(
      (item) => item.careItemId !== careItemId,
    )
  }
  const mealPlansByDogId = {}
  for (const [dogId, plan] of Object.entries(state.mealPlansByDogId ?? {})) {
    mealPlansByDogId[dogId] = (plan ?? []).filter(
      (item) => item.foodId !== careItemId,
    )
  }
  const logs = (state.logs ?? []).map((log) =>
    log.careItemId === careItemId ? { ...log, careItemId: null } : log,
  )
  const dogs = (state.dogs ?? []).map((dog) => ({
    ...dog,
    medicationNeedIds: (dog.medicationNeedIds ?? []).filter(
      (id) => id !== careItemId,
    ),
  }))
  return { menusByDogId, mealPlansByDogId, logs, dogs }
}
