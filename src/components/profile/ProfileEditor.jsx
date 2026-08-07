import Card from '../ui/Card'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'

/** P1 — Dog profile setup (scaffold) */
export default function ProfileEditor() {
  const { activeDog, dogs, dispatch, createId } = useApp()

  function seedDemoDog() {
    dispatch({
      type: 'UPSERT_DOG',
      payload: {
        id: createId('dog'),
        name: 'Buster',
        weight: 45,
        weightUnit: 'lbs',
        goal: 'maintain',
        activityLevel: 'neutered_adult',
        photoUrl: '',
      },
    })
  }

  if (!activeDog) {
    return (
      <Card className="text-center">
        <h2 className="text-xl font-bold text-slate-800">Meet your pup</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a dog profile to unlock calorie and gram calculations.
        </p>
        <Button className="mt-5 w-full" onClick={seedDemoDog}>
          Add demo dog
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-800">{activeDog.name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Weight</dt>
          <dd className="font-semibold text-slate-800">
            {activeDog.weight} {activeDog.weightUnit}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Goal</dt>
          <dd className="font-semibold capitalize text-slate-800">
            {activeDog.goal}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">RER</dt>
          <dd className="font-semibold text-slate-800">
            {activeDog.calculatedRER} kcal
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Daily target (DER)</dt>
          <dd className="font-semibold text-[#10B981]">
            {activeDog.targetDER} kcal
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-slate-400">
        {dogs.length} dog{dogs.length === 1 ? '' : 's'} saved in localStorage
      </p>
    </Card>
  )
}
