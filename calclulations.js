// RER Calculation: 70 * (weight_in_kg)^0.75
export function calculateRER(weight, unit = 'lbs') {
    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;
    return Math.round(70 * Math.pow(weightInKg, 0.75));
  }
  
  // DER Calculation: RER * activityMultiplier
  export function calculateDER(rer, multiplier) {
    return Math.round(rer * multiplier);
  }
  
  // Portion in Grams based on target kcal allocation and food density (kcal/kg)
  export function calculateServingGrams(targetKcalForItem, kcalPerKg) {
    if (!kcalPerKg || kcalPerKg <= 0) return 0;
    return Math.round((targetKcalForItem / kcalPerKg) * 1000);
  }