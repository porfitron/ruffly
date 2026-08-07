import { useState } from 'react'
import Header from './components/layout/Header'
import Navigation from './components/layout/Navigation'
import ProfileEditor from './components/profile/ProfileEditor'
import ProTeaserModal from './components/profile/ProTeaserModal'
import PantryList from './components/pantry/PantryList'
import FoodItemForm from './components/pantry/FoodItemForm'
import BowlBalancer from './components/bowl/BowlBalancer'
import TripCalculator from './components/trip/TripCalculator'
import DogsitterSheet from './components/trip/DogsitterSheet'

const SUBTITLES = {
  profile: 'Precision nutrition for your pup',
  pantry: 'Foods, densities & reorder links',
  bowl: 'Balance the bowl to the daily target',
  trip: 'Pack food & share a care sheet',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] pb-24">
      <Header subtitle={SUBTITLES[activeTab]} />

      <main className="space-y-4 px-4">
        {activeTab === 'profile' && (
          <>
            <ProfileEditor />
            <ProTeaserModal />
          </>
        )}

        {activeTab === 'pantry' && (
          <>
            <PantryList />
            <FoodItemForm />
          </>
        )}

        {activeTab === 'bowl' && <BowlBalancer />}

        {activeTab === 'trip' && (
          <>
            <TripCalculator />
            <DogsitterSheet />
          </>
        )}
      </main>

      <Navigation activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
