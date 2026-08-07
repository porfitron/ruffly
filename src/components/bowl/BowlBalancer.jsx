import Card from '../ui/Card'
import CalorieRing from './CalorieRing'
import PortionSlider from './PortionSlider'
import { useApp } from '../../context/AppContext'

/** P2 — Bowl balancer scaffold */
export default function BowlBalancer() {
  const { activeDog, currentMealPlan } = useApp()
  const target = activeDog?.targetDER ?? 0
  const allocated = currentMealPlan.reduce((sum, item) => sum + item.percentage, 0)

  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-800">Bowl balancer</h2>
      <p className="mt-1 text-sm text-slate-500">
        Mix kibble, wet food, and treats against the daily calorie target.
      </p>
      <div className="mt-6 flex flex-col items-center gap-6">
        <CalorieRing allocatedPercent={allocated} targetKcal={target} />
        <PortionSlider />
      </div>
    </Card>
  )
}
