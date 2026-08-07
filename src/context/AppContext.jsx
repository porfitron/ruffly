import { createContext, useContext, useEffect, useReducer } from 'react'
import { loadAppData, saveAppData, createId, EMPTY_CARE_INFO } from '../utils/storage'
import {
  calculateDER,
  calculateRER,
  resolveGoalMultiplier,
} from '../utils/calculations'

const AppContext = createContext(null)

function enrichDog(dog) {
  const multiplier = resolveGoalMultiplier(
    dog.goal,
    dog.activityLevel,
    dog.goalIntensity,
  )
  const calculatedRER = calculateRER(dog.weight, dog.weightUnit)
  const targetDER = calculateDER(calculatedRER, multiplier)
  return {
    ...dog,
    careInfo: { ...EMPTY_CARE_INFO, ...(dog.careInfo ?? {}) },
    activityMultiplier: multiplier,
    calculatedRER,
    targetDER,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPSERT_DOG': {
      const dog = enrichDog(action.payload)
      const exists = state.dogs.some((d) => d.id === dog.id)
      const dogs = exists
        ? state.dogs.map((d) => (d.id === dog.id ? dog : d))
        : [...state.dogs, dog]
      return {
        ...state,
        dogs,
        activeDogId: state.activeDogId ?? dog.id,
      }
    }
    case 'SET_ACTIVE_DOG':
      return { ...state, activeDogId: action.payload }
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
        currentMealPlan: state.currentMealPlan.filter(
          (item) => item.foodId !== action.payload,
        ),
      }
    case 'SET_MEAL_PLAN':
      return { ...state, currentMealPlan: action.payload }
    case 'SET_MEAL_PERCENTAGE': {
      const { foodId, percentage } = action.payload
      const clamped = Math.min(Math.max(Number(percentage) || 0, 0), 100)
      const exists = state.currentMealPlan.some((item) => item.foodId === foodId)
      const currentMealPlan = exists
        ? state.currentMealPlan.map((item) =>
            item.foodId === foodId ? { ...item, percentage: clamped } : item,
          )
        : [...state.currentMealPlan, { foodId, percentage: clamped }]
      return { ...state, currentMealPlan }
    }
    case 'REMOVE_FROM_MEAL':
      return {
        ...state,
        currentMealPlan: state.currentMealPlan.filter(
          (item) => item.foodId !== action.payload,
        ),
      }
    case 'ADD_TO_MEAL': {
      const foodId = action.payload
      if (state.currentMealPlan.some((item) => item.foodId === foodId)) {
        return state
      }
      return {
        ...state,
        currentMealPlan: [...state.currentMealPlan, { foodId, percentage: 0 }],
      }
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
    case 'REPLACE_ALL':
      return action.payload
    default:
      return state
  }
}

function hydrateAppData() {
  const data = loadAppData()
  return {
    ...data,
    dogs: (data.dogs ?? []).map(enrichDog),
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrateAppData)

  useEffect(() => {
    saveAppData(state)
  }, [state])

  const activeDog =
    state.dogs.find((dog) => dog.id === state.activeDogId) ?? null

  const value = {
    ...state,
    activeDog,
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
