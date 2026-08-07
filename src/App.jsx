import { useState } from 'react'
import Header from './components/layout/Header'
import Navigation from './components/layout/Navigation'
import ProfileEditor from './components/profile/ProfileEditor'
import PortionCalculator from './components/profile/PortionCalculator'
import ProTeaserModal from './components/profile/ProTeaserModal'
import { useApp } from './context/AppContext'
import PantryTab from './components/pantry/PantryTab'
import BowlBalancer from './components/bowl/BowlBalancer'
import TripTab from './components/trip/TripTab'

const SUBTITLES = {
  profile: 'Precision nutrition for your pup',
  pantry: 'Foods, densities & reorder links',
  bowl: 'Balance the bowl to the daily target',
  trip: 'Pack food & share a care sheet',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('profile')
  const { activeDog } = useApp()

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] pb-24 print:max-w-none print:bg-white print:pb-0">
      <div className="print:hidden">
        <Header subtitle={SUBTITLES[activeTab]} />
      </div>

      <main className="space-y-4 px-4 print:space-y-0 print:px-0">
        {activeTab === 'profile' && (
          <>
            <ProfileEditor />
            <PortionCalculator />
            {activeDog ? <ProTeaserModal /> : null}
          </>
        )}

        {activeTab === 'pantry' && <PantryTab />}

        {activeTab === 'bowl' && <BowlBalancer />}

        {activeTab === 'trip' && <TripTab />}
      </main>

      <div className="print:hidden">
        <Navigation activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  )
}
