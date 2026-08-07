// RER: 70 × (weight in kg)^0.75
export function calculateRER(weight, unit = 'lbs') {
  const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight
  return Math.round(70 * Math.pow(weightInKg, 0.75))
}

// DER: RER × activityMultiplier
export function calculateDER(rer, multiplier) {
  return Math.round(rer * multiplier)
}

// Grams from target kcal allocation and food density (kcal/kg)
export function calculateServingGrams(targetKcalForItem, kcalPerKg) {
  if (!kcalPerKg || kcalPerKg <= 0) return 0
  return Math.round((targetKcalForItem / kcalPerKg) * 1000)
}

/** Common veterinary RER activity multipliers */
export const ACTIVITY_MULTIPLIERS = {
  weight_loss: 1.0,
  weight_loss_upper: 1.2,
  neutered_adult: 1.6,
  intact_adult: 1.8,
  active_working: 2.0,
  puppy_0_4: 3.0,
  puppy_4_plus: 2.0,
  weight_gain: 1.2,
  weight_gain_upper: 1.4,
}

export function resolveGoalMultiplier(goal, activityLevel) {
  if (goal === 'loss') return ACTIVITY_MULTIPLIERS.weight_loss
  if (goal === 'gain') return ACTIVITY_MULTIPLIERS.weight_gain
  return ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.neutered_adult
}
