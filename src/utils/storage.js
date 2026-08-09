import { uniqueDogSlug } from './dogs'

const STORAGE_KEY = 'ruffly_app_data_v1'

export const DEFAULT_APP_DATA = {
  activeDogId: null,
  dogs: [],
  pantry: [],
  mealPlansByDogId: {},
  tripSettings: {
    days: 3,
    bufferMode: 'plus1',
  },
  proTeaser: {
    hasClickedAddDog: false,
    userEmail: null,
  },
}

export const EMPTY_CARE_INFO = {
  ownerName: '',
  ownerPhone: '',
  emergencyName: '',
  emergencyPhone: '',
  vetName: '',
  vetPhone: '',
  notes: '',
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

/** Migrate legacy currentMealPlan → mealPlansByDogId and ensure slugs. */
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

  const {
    currentMealPlan: _legacyMealPlan,
    ...parsedWithoutLegacy
  } = parsed

  return {
    ...base,
    ...parsedWithoutLegacy,
    dogs,
    activeDogId,
    mealPlansByDogId,
    tripSettings: {
      ...base.tripSettings,
      ...(parsed.tripSettings ?? {}),
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
  const { currentMealPlan: _legacy, ...persistable } = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY)
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
