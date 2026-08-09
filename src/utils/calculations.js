// RER: 70 × (weight in kg)^0.75
export function calculateRER(weight, unit = 'lbs') {
  const numeric = Number(weight)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  const weightInKg = unit === 'lbs' ? numeric * 0.453592 : numeric
  return Math.round(70 * Math.pow(weightInKg, 0.75))
}

// DER: RER × activityMultiplier
export function calculateDER(rer, multiplier) {
  const m = Number(multiplier)
  if (!Number.isFinite(rer) || !Number.isFinite(m) || m <= 0) return 0
  return Math.round(rer * m)
}

// Grams from target kcal allocation and food density (kcal/kg)
export function calculateServingGrams(targetKcalForItem, kcalPerKg) {
  if (!kcalPerKg || kcalPerKg <= 0 || !targetKcalForItem) return 0
  return Math.round((targetKcalForItem / kcalPerKg) * 1000)
}

/** Cups from target kcal when food lists kcal/cup */
export function calculateServingCups(targetKcalForItem, kcalPerCup) {
  if (!kcalPerCup || kcalPerCup <= 0 || !targetKcalForItem) return 0
  return Math.round((targetKcalForItem / kcalPerCup) * 10) / 10
}

/** Cans/pouches from target kcal when food lists kcal/can */
export function calculateServingCans(targetKcalForItem, kcalPerCan) {
  if (!kcalPerCan || kcalPerCan <= 0 || !targetKcalForItem) return 0
  return Math.round((targetKcalForItem / kcalPerCan) * 100) / 100
}

export const FOOD_CATEGORIES = [
  { value: 'kibble', label: 'Kibble' },
  { value: 'wet', label: 'Wet / canned' },
  { value: 'topper', label: 'Topper / fresh' },
  { value: 'treat', label: 'Treat' },
]

export function getCategoryLabel(category) {
  return FOOD_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

/**
 * Resolve gram/cup/can servings for a food given allocated kcal.
 * Split across mealsPerDay (1 = daily bowl, 2 = morning + evening).
 */
export function resolveFoodServings(food, targetKcal, mealsPerDay = 2) {
  const grams = calculateServingGrams(targetKcal, food.kcalPerKg)
  const cups = calculateServingCups(targetKcal, food.kcalPerCup)
  const cans = calculateServingCans(targetKcal, food.kcalPerCan)
  const meals = Number(mealsPerDay) === 1 ? 1 : 2

  if (meals === 1) {
    return {
      kcal: Math.round(targetKcal),
      grams,
      cups,
      cans,
      breakfastGrams: grams,
      dinnerGrams: 0,
      breakfastCups: cups,
      dinnerCups: 0,
      breakfastCans: cans,
      dinnerCans: 0,
    }
  }

  return {
    kcal: Math.round(targetKcal),
    grams,
    cups,
    cans,
    breakfastGrams: grams ? Math.round(grams / 2) : 0,
    dinnerGrams: grams ? Math.round(grams / 2) : 0,
    breakfastCups: cups ? Math.round((cups / 2) * 10) / 10 : 0,
    dinnerCups: cups ? Math.round((cups / 2) * 10) / 10 : 0,
    breakfastCans: cans ? Math.round((cans / 2) * 100) / 100 : 0,
    dinnerCans: cans ? Math.round((cans / 2) * 100) / 100 : 0,
  }
}

/** Meal-time bowl sections for display (Daily vs Morning/Evening). */
export function resolveMealSessions(mealsPerDay = 2) {
  if (Number(mealsPerDay) === 1) {
    return [
      {
        id: 'daily',
        label: 'Daily Bowl',
        which: 'daily',
        gramsKey: 'grams',
        cupsKey: 'cups',
        cansKey: 'cans',
        share: 1,
      },
    ]
  }
  return [
    {
      id: 'morning',
      label: 'Morning Bowl',
      which: 'breakfast',
      gramsKey: 'breakfastGrams',
      cupsKey: 'breakfastCups',
      cansKey: 'breakfastCans',
      share: 0.5,
    },
    {
      id: 'evening',
      label: 'Evening Bowl',
      which: 'dinner',
      gramsKey: 'dinnerGrams',
      cupsKey: 'dinnerCups',
      cansKey: 'dinnerCans',
      share: 0.5,
    },
  ]
}

/**
 * Build enriched meal-plan rows for the bowl balancer.
 */
export function buildMealBreakdown(mealPlan, pantry, dailyDer, mealsPerDay = 2) {
  return mealPlan
    .map((item) => {
      const food = pantry.find((f) => f.id === item.foodId)
      if (!food) return null
      const allocatedKcal = (dailyDer * (item.percentage || 0)) / 100
      return {
        ...item,
        food,
        allocatedKcal,
        servings: resolveFoodServings(food, allocatedKcal, mealsPerDay),
      }
    })
    .filter(Boolean)
}

/** Common veterinary RER activity multipliers */
export const ACTIVITY_MULTIPLIERS = {
  weight_loss_aggressive: 1.0,
  weight_loss: 1.1,
  weight_loss_mild: 1.2,
  inactive_adult: 1.0,
  neutered_adult: 1.4,
  intact_adult: 1.8,
  active_working: 2.0,
  puppy_0_4: 3.0,
  puppy_4_plus: 2.0,
  weight_gain_mild: 1.2,
  weight_gain: 1.3,
  weight_gain_push: 1.4,
}

export const ACTIVITY_OPTIONS = [
  { value: 'inactive_adult', label: 'Inactive adult', multiplier: 1.0 },
  { value: 'neutered_adult', label: 'Typical pet adult', multiplier: 1.4 },
  { value: 'intact_adult', label: 'Intact adult', multiplier: 1.8 },
  { value: 'active_working', label: 'Active / working', multiplier: 2.0 },
  { value: 'puppy_0_4', label: 'Puppy (0–4 months)', multiplier: 3.0 },
  { value: 'puppy_4_plus', label: 'Puppy (4+ months)', multiplier: 2.0 },
]

export const GOAL_OPTIONS = [
  { value: 'maintain', label: 'Maintain' },
  { value: 'loss', label: 'Weight loss' },
  { value: 'gain', label: 'Weight gain' },
]

export const LOSS_INTENSITY_OPTIONS = [
  { value: 'mild', label: 'Gentle (1.2× RER)', multiplier: 1.2 },
  { value: 'moderate', label: 'Steady (1.1× RER)', multiplier: 1.1 },
  { value: 'aggressive', label: 'Focus (1.0× RER)', multiplier: 1.0 },
]

export const GAIN_INTENSITY_OPTIONS = [
  { value: 'mild', label: 'Gentle (1.2× RER)', multiplier: 1.2 },
  { value: 'moderate', label: 'Steady (1.3× RER)', multiplier: 1.3 },
  { value: 'push', label: 'Build (1.4× RER)', multiplier: 1.4 },
]

export function resolveGoalMultiplier(goal, activityLevel, goalIntensity = 'moderate') {
  if (goal === 'loss') {
    const match = LOSS_INTENSITY_OPTIONS.find((o) => o.value === goalIntensity)
    return match?.multiplier ?? ACTIVITY_MULTIPLIERS.weight_loss
  }
  if (goal === 'gain') {
    const match = GAIN_INTENSITY_OPTIONS.find((o) => o.value === goalIntensity)
    return match?.multiplier ?? ACTIVITY_MULTIPLIERS.weight_gain
  }
  const activity = ACTIVITY_OPTIONS.find((o) => o.value === activityLevel)
  return activity?.multiplier ?? ACTIVITY_MULTIPLIERS.neutered_adult
}

export function splitMeals(dailyAmount, mealsPerDay = 2) {
  if (!dailyAmount || mealsPerDay < 1) return []
  const base = dailyAmount / mealsPerDay
  // Keep one decimal for cups; integers stay integers via caller rounding
  return Array.from({ length: mealsPerDay }, () => base)
}

export const BUFFER_OPTIONS = [
  { value: 'plus1', label: '+1 day', hint: 'Default safety day' },
  { value: 'percent10', label: '+10%', hint: 'Scale by trip length' },
  { value: 'none', label: 'None', hint: 'Exact trip days only' },
]

/** Convert trip length + buffer mode into days of food to pack */
export function resolvePackDays(days, bufferMode = 'plus1') {
  const n = Math.max(Number(days) || 0, 0)
  if (n <= 0) return 0
  if (bufferMode === 'percent10') return Math.round(n * 1.1 * 10) / 10
  if (bufferMode === 'none') return n
  return n + 1
}

/**
 * Prefer the bowl meal plan; fall back to the dog's P1 primaryFood at 100%.
 */
export function resolveActiveFeedingPlan(activeDog, pantry, mealPlan) {
  const der = activeDog?.targetDER ?? 0
  const mealsPerDay = Number(activeDog?.mealsPerDay) === 1 ? 1 : 2
  const breakdown = buildMealBreakdown(mealPlan, pantry, der, mealsPerDay)
  if (breakdown.length > 0) return breakdown

  const primary = activeDog?.primaryFood
  if (!primary || (!primary.kcalPerKg && !primary.kcalPerCup && !primary.kcalPerCan)) {
    return []
  }

  const syntheticFood = {
    id: '__primary__',
    name: primary.name || 'Primary food',
    brand: '',
    category: 'kibble',
    kcalPerKg: primary.kcalPerKg,
    kcalPerCup: primary.kcalPerCup,
    kcalPerCan: primary.kcalPerCan ?? null,
    productUrl: '',
  }

  return buildMealBreakdown(
    [{ foodId: '__primary__', percentage: 100 }],
    [syntheticFood],
    der,
    mealsPerDay,
  )
}

/** Multiply daily servings by pack days for each bowl item */
export function buildTripPackList(feedingPlan, packDays) {
  return feedingPlan.map((item) => {
    const { servings, food, percentage, allocatedKcal } = item
    return {
      food,
      percentage,
      dailyKcal: allocatedKcal,
      packKcal: Math.round(allocatedKcal * packDays),
      packGrams: servings.grams ? Math.ceil(servings.grams * packDays) : 0,
      packCups:
        servings.cups
          ? Math.round(servings.cups * packDays * 10) / 10
          : 0,
      packCans:
        servings.cans
          ? Math.round(servings.cans * packDays * 100) / 100
          : 0,
      dailyServings: servings,
    }
  })
}
