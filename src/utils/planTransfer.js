import { DEFAULT_APP_DATA } from './storage'

export const PLAN_QR_PREFIX = 'ruffly1:'
/** Stay under QR Version 40-L byte capacity with margin. */
export const MAX_QR_BYTES = 2200

function trimCareInfo(careInfo) {
  if (!careInfo || typeof careInfo !== 'object') return undefined
  const next = {}
  for (const [key, value] of Object.entries(careInfo)) {
    if (typeof value === 'string' && value.trim()) next[key] = value.trim()
  }
  return Object.keys(next).length ? next : undefined
}

function leanDog(dog) {
  const next = {
    id: dog.id,
    name: dog.name,
    weight: dog.weight,
    weightUnit: dog.weightUnit,
    goal: dog.goal,
    goalIntensity: dog.goalIntensity,
    activityLevel: dog.activityLevel,
  }
  if (dog.primaryFood && typeof dog.primaryFood === 'object') {
    next.primaryFood = dog.primaryFood
  }
  const careInfo = trimCareInfo(dog.careInfo)
  if (careInfo) next.careInfo = careInfo
  return next
}

function leanFood(food) {
  const next = {
    id: food.id,
    name: food.name,
    category: food.category,
  }
  if (food.brand) next.brand = food.brand
  if (food.kcalPerKg != null) next.kcalPerKg = food.kcalPerKg
  if (food.kcalPerCup != null) next.kcalPerCup = food.kcalPerCup
  if (food.kcalPerCan != null) next.kcalPerCan = food.kcalPerCan
  if (food.productUrl) next.productUrl = food.productUrl
  return next
}

export function buildPlanPayload(state) {
  return {
    v: 1,
    activeDogId: state.activeDogId ?? null,
    dogs: (state.dogs ?? []).map(leanDog),
    pantry: (state.pantry ?? []).map(leanFood),
    currentMealPlan: state.currentMealPlan ?? [],
    tripSettings: {
      ...DEFAULT_APP_DATA.tripSettings,
      ...(state.tripSettings ?? {}),
    },
  }
}

export function encodePlanForQr(state) {
  const payload = `${PLAN_QR_PREFIX}${JSON.stringify(buildPlanPayload(state))}`
  const bytes = new TextEncoder().encode(payload).length
  if (bytes > MAX_QR_BYTES) {
    throw new Error(
      'This plan is too large for a QR code. Remove some pantry items and try again.',
    )
  }
  return payload
}

export function summarizePlan(plan) {
  const dogs = plan.dogs ?? []
  const pantry = plan.pantry ?? []
  const mealItems = plan.currentMealPlan ?? []
  const dogNames = dogs.map((d) => d.name || 'Unnamed').filter(Boolean)
  return {
    dogCount: dogs.length,
    dogNames,
    pantryCount: pantry.length,
    mealItemCount: mealItems.length,
  }
}

export function decodePlan(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('No plan data found.')

  let parsed
  if (trimmed.startsWith(PLAN_QR_PREFIX)) {
    parsed = JSON.parse(trimmed.slice(PLAN_QR_PREFIX.length))
  } else if (trimmed.startsWith('ruffly1.')) {
    const binary = atob(trimmed.slice('ruffly1.'.length))
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } else {
    parsed = JSON.parse(trimmed)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That does not look like a valid Ruffly plan.')
  }

  if (!Array.isArray(parsed.dogs) || !Array.isArray(parsed.pantry)) {
    throw new Error('That plan is missing dog or pantry data.')
  }

  return {
    ...structuredClone(DEFAULT_APP_DATA),
    activeDogId: parsed.activeDogId ?? parsed.dogs[0]?.id ?? null,
    dogs: parsed.dogs,
    pantry: parsed.pantry,
    currentMealPlan: Array.isArray(parsed.currentMealPlan)
      ? parsed.currentMealPlan
      : [],
    tripSettings: {
      ...DEFAULT_APP_DATA.tripSettings,
      ...(parsed.tripSettings ?? {}),
    },
  }
}
