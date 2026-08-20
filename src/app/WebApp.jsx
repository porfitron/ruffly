import { useCallback, useState } from 'react'
import Header from '../components/layout/Header'
import Navigation from '../components/layout/Navigation'
import MenuDialogs from '../components/layout/MenuDialogs'
import MyAccountPage from '../components/account/MyAccountPage'
import DogsOverview from '../components/profile/DogsOverview'
import TodayView from '../components/log/TodayView'
import QuickLogSheet, {
  MenuEditorSheet,
} from '../components/log/QuickLogSheet'
import FleamailSheet from '../components/log/FleamailSheet'
import CatalogTab from '../components/catalog/CatalogTab'
import CareGuideTab from '../components/trip/CareGuideTab'
import HomeScreenBadgePrompt from '../components/layout/HomeScreenBadgePrompt'
import MealCelebration from '../components/ui/MealCelebration'
import { useApp } from '../context/AppContext'

const SUBTITLES = {
  today: 'What your pack needs today',
  pack: 'Dogs, menus & profiles',
  pantry: 'Food, meds & supplements library',
  care: 'Printable notes for a sitter',
}

function isOwnerAccountIncomplete(ownerAccount) {
  if (!ownerAccount) return true
  return !['name', 'phone', 'email'].every(
    (field) =>
      typeof ownerAccount[field] === 'string' && ownerAccount[field].trim(),
  )
}

export default function WebApp() {
  const { ownerAccount, dogs } = useApp()
  const [activeTab, setActiveTab] = useState('today')
  const [menuDialog, setMenuDialog] = useState(null)
  const [addingNewDog, setAddingNewDog] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [fleamailOpen, setFleamailOpen] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [menuDogId, setMenuDogId] = useState(null)
  const [newDogMenu, setNewDogMenu] = useState(false)
  const [celebration, setCelebration] = useState(null)

  const accountIncomplete = isOwnerAccountIncomplete(ownerAccount)
  const dismissCelebration = useCallback(() => setCelebration(null), [])
  const playCelebration = useCallback((theme) => {
    if (!theme) return
    setCelebration({ theme, playId: Date.now() })
  }, [])

  function handleTabChange(id) {
    if (id === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setAddingNewDog(false)
    setActiveTab(id)
  }

  function openAddDog() {
    setActiveTab('pack')
    setAddingNewDog(true)
  }

  function openMenuEditor(dogId) {
    setMenuDogId(dogId ?? dogs[0]?.id ?? 'pick')
  }

  const menuItems = [
    {
      id: 'account',
      label: 'My Account',
      onClick: () => setShowAccount(true),
      showBadge: accountIncomplete,
    },
    {
      id: 'catalog',
      label: 'Catalog',
      onClick: () => handleTabChange('pantry'),
    },
    {
      id: 'care',
      label: 'Print Care Guide',
      onClick: () => handleTabChange('care'),
    },
    { id: 'share', label: 'Export Plan', onClick: () => setMenuDialog('share') },
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
          subtitle={SUBTITLES[activeTab] ?? SUBTITLES.today}
          menuItems={menuItems}
          menuBadge={accountIncomplete}
        />
      </div>

      <main className="space-y-4 px-4 print:space-y-0 print:px-0">
        {activeTab === 'today' ? <HomeScreenBadgePrompt /> : null}
        {activeTab === 'today' && (
          <TodayView
            onLog={() => {
              setEditLog(null)
              setLogOpen(true)
            }}
            onEditLog={(log) => {
              setEditLog(log)
              setLogOpen(true)
            }}
            onAddDog={openAddDog}
            onOpenPack={() => handleTabChange('pack')}
            onEditMenu={openMenuEditor}
          />
        )}

        {activeTab === 'pack' && (
          <DogsOverview
            addingNew={addingNewDog}
            onAddNew={() => setAddingNewDog(true)}
            onCancelAdd={() => setAddingNewDog(false)}
            onAdded={(dogId) => {
              setAddingNewDog(false)
              // Menu is the onboarding goal.
              if (dogId) {
                setNewDogMenu(true)
                openMenuEditor(dogId)
              }
            }}
            onEditMenu={openMenuEditor}
          />
        )}

        {activeTab === 'pantry' && <CatalogTab />}

        {activeTab === 'care' && <CareGuideTab />}
      </main>

      <div className="print:hidden">
        {(activeTab === 'today' || activeTab === 'pack') && (
          <Navigation
            activeTab={activeTab}
            onChange={handleTabChange}
            onLog={() => {
              setEditLog(null)
              setLogOpen(true)
            }}
          />
        )}
        {activeTab === 'pantry' || activeTab === 'care' ? (
          <div className="fixed inset-x-0 bottom-0 border-t border-amber-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <button
              type="button"
              className="mx-auto block w-full max-w-lg h-12 rounded-2xl bg-[#F59E0B] text-sm font-semibold text-white"
              onClick={() => handleTabChange('today')}
            >
              Back to Today
            </button>
          </div>
        ) : null}
      </div>

      <QuickLogSheet
        open={logOpen}
        editLog={editLog}
        onClose={() => {
          setLogOpen(false)
          setEditLog(null)
        }}
        onCelebrate={playCelebration}
        onFleamail={() => {
          setLogOpen(false)
          setEditLog(null)
          setFleamailOpen(true)
        }}
      />
      <FleamailSheet
        open={fleamailOpen}
        onClose={() => setFleamailOpen(false)}
      />
      <MenuEditorSheet
        open={Boolean(menuDogId)}
        dogId={menuDogId === 'pick' ? null : menuDogId}
        onDogChange={(id) => setMenuDogId(id)}
        onDone={() => {
          if (newDogMenu) playCelebration('tongue')
          setNewDogMenu(false)
        }}
        onClose={() => {
          setMenuDogId(null)
          setNewDogMenu(false)
        }}
      />

      <MealCelebration
        playId={celebration?.playId ?? null}
        theme={celebration?.theme ?? 'tongue'}
        onDone={dismissCelebration}
      />

      <MenuDialogs dialog={menuDialog} onClose={() => setMenuDialog(null)} />
    </div>
  )
}
