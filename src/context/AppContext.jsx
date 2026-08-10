import { createContext, useContext, useEffect, useReducer } from 'react'
import {
  loadAppData,
  saveAppData,
  createId,
  EMPTY_CARE_INFO,
  EMPTY_OWNER_ACCOUNT,
  normalizeAppData,
} from '../utils/storage'
import {
  calculateDER,
  calculateRER,
  resolveGoalMultiplier,
} from '../utils/calculations'
import {
  findDogByPupParam,
  pupSearchForState,
  readPupParam,
  uniqueDogSlug,
} from '../utils/dogs'

const AppContext = createContext(null)

function enrichDog(dog) {
  const calculatedRER = calculateRER(dog.weight, dog.weightUnit)
  const calorieMode = dog.calorieMode === 'manual' ? 'manual' : 'calculator'
  const manualTarget = Number(dog.manualTargetKcal)
  const mealsPerDay = Number(dog.mealsPerDay) === 1 ? 1 : 2

  if (calorieMode === 'manual' && Number.isFinite(manualTarget) && manualTarget > 0) {
    return {
      ...dog,
      calorieMode,
      mealsPerDay,
      careInfo: { ...EMPTY_CARE_INFO, ...(dog.careInfo ?? {}) },
      activityMultiplier: null,
      calculatedRER,
      targetDER: Math.round(manualTarget),
    }
  }

  const multiplier = resolveGoalMultiplier(
    dog.goal,
    dog.activityLevel,
    dog.goalIntensity,
  )
  const targetDER = calculateDER(calculatedRER, multiplier)
  return {
    ...dog,
    calorieMode: 'calculator',
    mealsPerDay,
    careInfo: { ...EMPTY_CARE_INFO, ...(dog.careInfo ?? {}) },
    activityMultiplier: multiplier,
    calculatedRER,
    targetDER,
  }
}

function mealPlanFor(state, dogId = state.activeDogId) {
  if (!dogId) return []
  return state.mealPlansByDogId?.[dogId] ?? []
}

function withActiveMealPlan(state, plan) {
  if (!state.activeDogId) return state
  return {
    ...state,
    mealPlansByDogId: {
      ...state.mealPlansByDogId,
      [state.activeDogId]: plan,
    },
  }
}

function stripFoodFromAllPlans(mealPlansByDogId, foodId) {
  const next = {}
  for (const [dogId, plan] of Object.entries(mealPlansByDogId ?? {})) {
    next[dogId] = (plan ?? []).filter((item) => item.foodId !== foodId)
  }
  return next
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPSERT_DOG': {
      const incoming = action.payload
      const exists = state.dogs.some((d) => d.id === incoming.id)
      const previous = exists
        ? state.dogs.find((d) => d.id === incoming.id)
        : null
      // Keep slug stable across renames so ?pup= links keep working.
      const slug =
        previous?.slug ||
        incoming.slug ||
        uniqueDogSlug(incoming.name, state.dogs, incoming.id)
      const account = state.ownerAccount ?? EMPTY_OWNER_ACCOUNT
      const incomingCare = incoming.careInfo ?? {}
      const dog = enrichDog({
        ...incoming,
        slug,
        careInfo: {
          ...EMPTY_CARE_INFO,
          ...incomingCare,
          ownerName:
            incomingCare.ownerName?.trim() || account.name || '',
          ownerPhone:
            incomingCare.ownerPhone?.trim() || account.phone || '',
          ownerEmail:
            incomingCare.ownerEmail?.trim() || account.email || '',
        },
      })
      const dogs = exists
        ? state.dogs.map((d) => (d.id === dog.id ? dog : d))
        : [...state.dogs, dog]
      const mealPlansByDogId = {
        ...state.mealPlansByDogId,
        [dog.id]: state.mealPlansByDogId?.[dog.id] ?? [],
      }
      return {
        ...state,
        dogs,
        mealPlansByDogId,
        activeDogId: dog.id,
      }
    }
    case 'SET_ACTIVE_DOG':
      return { ...state, activeDogId: action.payload }
    case 'REMOVE_DOG': {
      const dogId = action.payload
      const dogs = state.dogs.filter((d) => d.id !== dogId)
      const { [dogId]: _removed, ...mealPlansByDogId } =
        state.mealPlansByDogId ?? {}
      const activeDogId =
        state.activeDogId === dogId
          ? (dogs[0]?.id ?? null)
          : state.activeDogId
      return {
        ...state,
        dogs,
        mealPlansByDogId,
        activeDogId,
      }
    }
    case 'UPSERT_FOOD': {
      const food = action.payload
      const exists = state.pantry.some((f) => f.id === food.id)
      const pantry = exists
        ? state.pantry.map((f) => (f.id === food.id ? food : f))
        : [...state.pantry, food]
      return { ...state, pantry }
    }
    case 'REMOVE_FOOD':
      return {
        ...state,
        pantry: state.pantry.filter((f) => f.id !== action.payload),
        mealPlansByDogId: stripFoodFromAllPlans(
          state.mealPlansByDogId,
          action.payload,
        ),
      }
    case 'SET_MEAL_PLAN':
      return withActiveMealPlan(state, action.payload)
    case 'SET_MEAL_PERCENTAGE': {
      const { foodId, percentage } = action.payload
      const clamped = Math.min(Math.max(Number(percentage) || 0, 0), 100)
      const current = mealPlanFor(state)
      const exists = current.some((item) => item.foodId === foodId)
      const plan = exists
        ? current.map((item) =>
            item.foodId === foodId ? { ...item, percentage: clamped } : item,
          )
        : [...current, { foodId, percentage: clamped }]
      return withActiveMealPlan(state, plan)
    }
    case 'REMOVE_FROM_MEAL':
      return withActiveMealPlan(
        state,
        mealPlanFor(state).filter((item) => item.foodId !== action.payload),
      )
    case 'ADD_TO_MEAL': {
      const foodId = action.payload
      const current = mealPlanFor(state)
      if (current.some((item) => item.foodId === foodId)) {
        return state
      }
      return withActiveMealPlan(state, [
        ...current,
        { foodId, percentage: 0 },
      ])
    }
    case 'MARK_ADD_DOG_TEASER':
      return {
        ...state,
        proTeaser: { ...state.proTeaser, hasClickedAddDog: true },
      }
    case 'SET_PRO_EMAIL':
      return {
        ...state,
        proTeaser: { ...state.proTeaser, userEmail: action.payload },
      }
    case 'SET_TRIP_SETTINGS':
      return {
        ...state,
        tripSettings: { ...state.tripSettings, ...action.payload },
      }
    case 'UPDATE_CARE_INFO': {
      if (!state.activeDogId) return state
      const dogs = state.dogs.map((dog) =>
        dog.id === state.activeDogId
          ? {
              ...dog,
              careInfo: {
                ...EMPTY_CARE_INFO,
                ...(dog.careInfo ?? {}),
                ...action.payload,
              },
            }
          : dog,
      )
      return { ...state, dogs }
    }
    case 'SET_OWNER_ACCOUNT': {
      const ownerAccount = {
        ...EMPTY_OWNER_ACCOUNT,
        ...action.payload,
      }
      const dogs = state.dogs.map((dog) => ({
        ...dog,
        careInfo: {
          ...EMPTY_CARE_INFO,
          ...(dog.careInfo ?? {}),
          ownerName: ownerAccount.name,
          ownerPhone: ownerAccount.phone,
          ownerEmail: ownerAccount.email,
        },
      }))
      return { ...state, ownerAccount, dogs }
    }
    case 'REPLACE_ALL': {
      const next = normalizeAppData(action.payload)
      return {
        ...next,
        dogs: (next.dogs ?? []).map(enrichDog),
      }
    }
    default:
      return state
  }
}

function hydrateAppData() {
  const data = loadAppData()
  const dogs = (data.dogs ?? []).map(enrichDog)
  const pup = readPupParam()
  const fromUrl = findDogByPupParam(dogs, pup)
  return {
    ...data,
    dogs,
    activeDogId: fromUrl?.id ?? data.activeDogId ?? dogs[0]?.id ?? null,
  }
}

function syncPupUrl(dogs, activeDogId) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const params = new URLSearchParams(url.search)
  const desired = pupSearchForState(dogs, activeDogId)

  if (desired) {
    const slug = new URLSearchParams(desired).get('pup')
    params.set('pup', slug)
  } else {
    params.delete('pup')
  }

  const search = params.toString()
  const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
  const current = `${url.pathname}${url.search}${url.hash}`
  if (next === current) return
  window.history.replaceState(window.history.state, '', next)
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrateAppData)

  useEffect(() => {
    saveAppData(state)
  }, [state])

  // Keep ?pup= in sync when there are multiple dogs; strip for a single pup.
  useEffect(() => {
    syncPupUrl(state.dogs, state.activeDogId)
  }, [state.dogs, state.activeDogId])

  useEffect(() => {
    function onPopState() {
      const pup = readPupParam()
      const match = findDogByPupParam(state.dogs, pup)
      if (match && match.id !== state.activeDogId) {
        dispatch({ type: 'SET_ACTIVE_DOG', payload: match.id })
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [state.dogs, state.activeDogId])

  const activeDog =
    state.dogs.find((dog) => dog.id === state.activeDogId) ?? null
  const currentMealPlan = mealPlanFor(state)

  const value = {
    ...state,
    activeDog,
    currentMealPlan,
    dispatch,
    createId,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
