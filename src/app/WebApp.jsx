import { useState } from 'react'
import Header from '../components/layout/Header'
import Navigation from '../components/layout/Navigation'
import MenuDialogs from '../components/layout/MenuDialogs'
import MyAccountPage from '../components/account/MyAccountPage'
import DogsOverview from '../components/profile/DogsOverview'
import ActiveDogSummary from '../components/profile/ActiveDogSummary'
import PantryTab from '../components/pantry/PantryTab'
import BowlBalancer from '../components/bowl/BowlBalancer'
import TripTab from '../components/trip/TripTab'
import { useApp } from '../context/AppContext'

const SUBTITLES = {
  profile: 'Precision nutrition for your pup',
  pantry: 'Foods, densities & reorder links',
  bowl: 'Balance the bowl to the daily target',
  trip: 'Pack food & share a care sheet',
}

function isOwnerAccountIncomplete(ownerAccount) {
  if (!ownerAccount) return true
  return !['name', 'phone', 'email'].every(
    (field) =>
      typeof ownerAccount[field] === 'string' && ownerAccount[field].trim(),
  )
}

export default function WebApp() {
  const { ownerAccount } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const [menuDialog, setMenuDialog] = useState(null)
  const [addingNewDog, setAddingNewDog] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  const accountIncomplete = isOwnerAccountIncomplete(ownerAccount)

  function handleTabChange(id) {
    if (id === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setAddingNewDog(false)
    setActiveTab(id)
  }

  const menuItems = [
    {
      id: 'account',
      label: 'My Account',
      onClick: () => setShowAccount(true),
      showBadge: accountIncomplete,
    },
    {
      id: 'pantry',
      label: 'My Pantry',
      onClick: () => handleTabChange('pantry'),
    },
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

  if (showAccount) {
    return <MyAccountPage onBack={() => setShowAccount(false)} />
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] pb-24 print:max-w-none print:bg-white print:pb-0">
      <div className="print:hidden">
        <Header
          subtitle={SUBTITLES[activeTab]}
          menuItems={menuItems}
          menuBadge={accountIncomplete}
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

        {activeTab === 'bowl' || activeTab === 'trip' ? (
          <ActiveDogSummary
            onAddDog={() => {
              setActiveTab('profile')
              setAddingNewDog(true)
            }}
          />
        ) : null}

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
