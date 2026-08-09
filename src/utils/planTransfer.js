import { zlibSync, unzlibSync, strToU8, strFromU8 } from 'fflate'
import { DEFAULT_APP_DATA } from './storage'

export const PLAN_QR_PREFIX_V1 = 'ruffly1:'
export const PLAN_QR_PREFIX = 'ruffly2:'
/** Keep codes coarse enough for phone-to-phone scanning. */
export const MAX_QR_BYTES = 900

function trimCareInfo(careInfo) {
  if (!careInfo || typeof careInfo !== 'object') return null
  const next = {}
  for (const [key, value] of Object.entries(careInfo)) {
    if (typeof value === 'string' && value.trim()) next[key] = value.trim()
  }
  return Object.keys(next).length ? next : null
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

/** Compact array form — shorter than verbose JSON keys. */
function toCompact(state) {
  return {
    v: 2,
    a: state.activeDogId ?? null,
    d: (state.dogs ?? []).map((dog) => [
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
    ]),
    p: (state.pantry ?? []).map((food) => [
      food.id,
      food.name ?? '',
      food.brand || null,
      food.category ?? 'kibble',
      food.kcalPerKg ?? null,
      food.kcalPerCup ?? null,
      food.kcalPerCan ?? null,
      food.flavor || null,
      // productUrl omitted — long URLs make QRs unscannable
    ]),
    m: (state.currentMealPlan ?? []).map((item) => [
      item.foodId,
      item.percentage ?? 0,
    ]),
    t: [
      state.tripSettings?.days ?? DEFAULT_APP_DATA.tripSettings.days,
      state.tripSettings?.bufferMode ?? DEFAULT_APP_DATA.tripSettings.bufferMode,
    ],
  }
}

function fromCompact(compact) {
  if (!compact || typeof compact !== 'object') {
    throw new Error('That does not look like a valid Ruffly plan.')
  }

  if (Array.isArray(compact.d) && Array.isArray(compact.p)) {
    return {
      ...structuredClone(DEFAULT_APP_DATA),
      activeDogId: compact.a ?? compact.d[0]?.[0] ?? null,
      dogs: compact.d.map((row) => ({
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
      })),
      pantry: compact.p.map((row) => ({
        id: row[0],
        name: row[1],
        ...(row[2] ? { brand: row[2] } : {}),
        category: row[3],
        ...(row[4] != null ? { kcalPerKg: row[4] } : {}),
        ...(row[5] != null ? { kcalPerCup: row[5] } : {}),
        ...(row[6] != null ? { kcalPerCan: row[6] } : {}),
        ...(row[7] ? { flavor: row[7] } : {}),
      })),
      currentMealPlan: (compact.m ?? []).map((row) => ({
        foodId: row[0],
        percentage: row[1],
      })),
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

  return {
    ...structuredClone(DEFAULT_APP_DATA),
    activeDogId: compact.activeDogId ?? compact.dogs[0]?.id ?? null,
    dogs: compact.dogs,
    pantry: compact.pantry,
    currentMealPlan: Array.isArray(compact.currentMealPlan)
      ? compact.currentMealPlan
      : [],
    tripSettings: {
      ...DEFAULT_APP_DATA.tripSettings,
      ...(compact.tripSettings ?? {}),
    },
  }
}

export function buildPlanPayload(state) {
  return fromCompact(toCompact(state))
}

export function encodePlanForQr(state) {
  const compact = toCompact(state)
  const compressed = zlibSync(strToU8(JSON.stringify(compact)), { level: 9 })
  const payload = `${PLAN_QR_PREFIX}${bytesToBase64Url(compressed)}`
  const bytes = new TextEncoder().encode(payload).length
  if (bytes > MAX_QR_BYTES) {
    throw new Error(
      'This plan is too large for a scannable QR code. Remove some pantry items and try again.',
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
