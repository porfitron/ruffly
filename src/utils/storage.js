const STORAGE_KEY = 'ruffly_app_data_v1'

export const DEFAULT_APP_DATA = {
  activeDogId: null,
  dogs: [],
  pantry: [],
  currentMealPlan: [],
  proTeaser: {
    hasClickedAddDog: false,
    userEmail: null,
  },
}

export function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_APP_DATA)
    return { ...structuredClone(DEFAULT_APP_DATA), ...JSON.parse(raw) }
  } catch {
    return structuredClone(DEFAULT_APP_DATA)
  }
}

export function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY)
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
