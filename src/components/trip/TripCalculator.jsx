import Card from '../ui/Card'

/** P3 — Trip packing calculator scaffold */
export default function TripCalculator() {
  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-800">Pack my bag</h2>
      <p className="mt-2 text-sm text-slate-500">
        Enter trip length and a safety buffer to get total food weight to pack.
      </p>
    </Card>
  )
}
