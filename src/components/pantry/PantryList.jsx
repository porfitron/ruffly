import Card from '../ui/Card'
import { useApp } from '../../context/AppContext'

/** P2 — Pantry list scaffold */
export default function PantryList() {
  const { pantry } = useApp()

  if (pantry.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Food pantry</h2>
        <p className="mt-2 text-sm text-slate-500">
          Save kibbles, wet food, toppers, and treats with calorie density and
          reorder links.
        </p>
      </Card>
    )
  }

  return (
    <ul className="space-y-3">
      {pantry.map((food) => (
        <Card as="li" key={food.id}>
          <p className="font-semibold text-slate-800">{food.name}</p>
          <p className="text-sm text-slate-500">
            {food.brand} · {food.category}
          </p>
        </Card>
      ))}
    </ul>
  )
}
