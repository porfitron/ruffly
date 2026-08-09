import { useState } from 'react'
import Header from '../components/layout/Header'
import Navigation from '../components/layout/Navigation'
import MenuDialogs from '../components/layout/MenuDialogs'
import DogsOverview from '../components/profile/DogsOverview'
import ActiveDogSummary from '../components/profile/ActiveDogSummary'
import PantryTab from '../components/pantry/PantryTab'
import BowlBalancer from '../components/bowl/BowlBalancer'
import TripTab from '../components/trip/TripTab'

const SUBTITLES = {
  profile: 'Precision nutrition for your pup',
  pantry: 'Foods, densities & reorder links',
  bowl: 'Balance the bowl to the daily target',
  trip: 'Pack food & share a care sheet',
}

export default function WebApp() {
  const [activeTab, setActiveTab] = useState('profile')
  const [menuDialog, setMenuDialog] = useState(null)
  const [addingNewDog, setAddingNewDog] = useState(false)

  function handleTabChange(id) {
    if (id === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setAddingNewDog(false)
    setActiveTab(id)
  }

  const menuItems = [
    { id: 'share', label: 'Share Plan', onClick: () => setMenuDialog('share') },
    {
      id: 'receive',
      label: 'Receive Plan',
      onClick: () => setMenuDialog('receive'),
    },
    { id: 'about', label: 'About Us', to: '/about' },
    {
      id: 'reset',
      label: 'Reset App',
      danger: true,
      onClick: () => setMenuDialog('reset'),
    },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] pb-24 print:max-w-none print:bg-white print:pb-0">
      <div className="print:hidden">
        <Header
          subtitle={SUBTITLES[activeTab]}
          menuItems={menuItems}
        />
      </div>

      <main className="space-y-4 px-4 print:space-y-0 print:px-0">
        {activeTab === 'profile' && (
          <DogsOverview
            addingNew={addingNewDog}
            onAddNew={() => setAddingNewDog(true)}
            onCancelAdd={() => setAddingNewDog(false)}
            onAdded={() => setAddingNewDog(false)}
            onGoToPantry={() => setActiveTab('pantry')}
            onGoToBowl={() => setActiveTab('bowl')}
          />
        )}

        {activeTab === 'pantry' || activeTab === 'bowl' || activeTab === 'trip'
          ? (
              <ActiveDogSummary
                onAddDog={() => {
                  setActiveTab('profile')
                  setAddingNewDog(true)
                }}
              />
            )
          : null}

        {activeTab === 'pantry' && <PantryTab />}

        {activeTab === 'bowl' && <BowlBalancer />}

        {activeTab === 'trip' && <TripTab />}
      </main>

      <div className="print:hidden">
        <Navigation
          activeTab={activeTab}
          onChange={handleTabChange}
          onAddDog={() => {
            setActiveTab('profile')
            setAddingNewDog(true)
          }}
        />
      </div>

      <MenuDialogs dialog={menuDialog} onClose={() => setMenuDialog(null)} />
    </div>
  )
}
