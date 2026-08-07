const STORAGE_KEY = 'ruffly_app_data_v1'

export const DEFAULT_APP_DATA = {
  activeDogId: null,
  dogs: [],
  pantry: [],
  currentMealPlan: [],
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

export function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_APP_DATA)
    const parsed = JSON.parse(raw)
    return {
      ...structuredClone(DEFAULT_APP_DATA),
      ...parsed,
      tripSettings: {
        ...DEFAULT_APP_DATA.tripSettings,
        ...(parsed.tripSettings ?? {}),
      },
      proTeaser: {
        ...DEFAULT_APP_DATA.proTeaser,
        ...(parsed.proTeaser ?? {}),
      },
    }
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
