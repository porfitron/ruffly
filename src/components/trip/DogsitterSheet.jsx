import Card from '../ui/Card'

/** P3 — Printable dogsitter care sheet scaffold */
export default function DogsitterSheet() {
  return (
    <Card className="print:shadow-none">
      <h2 className="text-xl font-bold text-slate-800">Dogsitter care sheet</h2>
      <p className="mt-2 text-sm text-slate-500 print:text-slate-700">
        Print-optimized care guide with morning/evening portions, emergency
        contacts, and reorder links.
      </p>
    </Card>
  )
}
