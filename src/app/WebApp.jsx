import { useCallback, useState } from 'react'
import Header from '../components/layout/Header'
import Navigation from '../components/layout/Navigation'
import MenuDialogs from '../components/layout/MenuDialogs'
import MyAccountPage from '../components/account/MyAccountPage'
import DogsOverview from '../components/profile/DogsOverview'
import TradingCardSheet from '../components/profile/TradingCardSheet'
import TodayView from '../components/log/TodayView'
import QuickLogSheet, {
  MenuEditorSheet,
} from '../components/log/QuickLogSheet'
import FleamailSheet from '../components/log/FleamailSheet'
import CatalogTab from '../components/catalog/CatalogTab'
import SearchView from '../components/search/SearchView'
import CareGuideTab from '../components/trip/CareGuideTab'
import HomeScreenBadgePrompt from '../components/layout/HomeScreenBadgePrompt'
import IosInstallHint from '../components/layout/IosInstallHint'
import MealCelebration from '../components/ui/MealCelebration'
import About from '../pages/About'
import Contact from '../pages/Contact'
import { useApp } from '../context/AppContext'
import { track, useAnalyticsScreen } from '../analytics'

const SUBTITLES = {
  today: 'What your pack needs today',
  search: 'Everything you’ve logged',
  pack: 'Dogs, menus & profiles',
  pantry: 'Food, meds & supplements library',
  care: 'Printable notes for a sitter',
}

const PRIMARY_TABS = ['today', 'search', 'pantry', 'pack']

function isOwnerAccountIncomplete(ownerAccount) {
  if (!ownerAccount) return true
  return !['name', 'phone', 'email'].every(
    (field) =>
      typeof ownerAccount[field] === 'string' && ownerAccount[field].trim(),
  )
}

export default function WebApp() {
  const { ownerAccount, dogs, dispatch } = useApp()
  const [activeTab, setActiveTab] = useState('today')
  const [secondaryReturnTab, setSecondaryReturnTab] = useState('today')
  const [menuDialog, setMenuDialog] = useState(null)
  const [addingNewDog, setAddingNewDog] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [fleamailOpen, setFleamailOpen] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [menuDogId, setMenuDogId] = useState(null)
  const [newDogMenu, setNewDogMenu] = useState(false)
  const [tradingCardDogId, setTradingCardDogId] = useState(null)
  const [celebration, setCelebration] = useState(null)

  const accountIncomplete = isOwnerAccountIncomplete(ownerAccount)
  const isSecondaryTab = activeTab === 'care'
  const screen = showAccount
    ? 'account'
    : showAbout
      ? 'about'
      : showContact
        ? 'contact'
        : activeTab === 'pantry'
          ? 'catalog'
          : activeTab === 'care'
            ? 'care'
            : activeTab
  useAnalyticsScreen(screen)
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

  /** Care Guide — tertiary screen uses header back (like Account). */
  function openSecondaryTab() {
    if (PRIMARY_TABS.includes(activeTab)) {
      setSecondaryReturnTab(activeTab)
    }
    handleTabChange('care')
  }

  function leaveSecondaryTab() {
    handleTabChange(
      PRIMARY_TABS.includes(secondaryReturnTab) ? secondaryReturnTab : 'today',
    )
  }

  function openAddDog() {
    track('open_add_dog', { source: 'Today' })
    setActiveTab('pack')
    setAddingNewDog(true)
  }

  function openMenuEditor(dogId) {
    track('open_routine_editor', { source: activeTab === 'pack' ? 'Pack' : 'Today' })
    setMenuDogId(dogId ?? dogs[0]?.id ?? 'pick')
  }

  function openCareGuide(dogId) {
    if (dogId) dispatch({ type: 'SET_ACTIVE_DOG', payload: dogId })
    openSecondaryTab()
  }

  function openTradingCard(dogId) {
    track('open_trading_card', { source: 'Pack' })
    setTradingCardDogId(dogId)
  }

  function openLogSheet({ edit = null, source = 'Log button' } = {}) {
    track('open_log_sheet', { source })
    setEditLog(edit)
    setLogOpen(true)
  }

  const menuItems = [
    {
      id: 'account',
      label: 'My Account',
      onClick: () => setShowAccount(true),
      showBadge: accountIncomplete,
    },
    {
      id: 'care',
      label: 'Print Care Guide',
      onClick: () => openSecondaryTab(),
    },
    { id: 'share', label: 'Export Plan', onClick: () => setMenuDialog('share') },
    {
      id: 'receive',
      label: 'Receive Plan',
      onClick: () => setMenuDialog('receive'),
    },
    { id: 'about', label: 'About Us', onClick: () => setShowAbout(true) },
    {
      id: 'contact',
      label: 'Contact Us',
      onClick: () => setShowContact(true),
    },
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

  if (showAbout) {
    return <About onBack={() => setShowAbout(false)} />
  }

  if (showContact) {
    return (
      <Contact
        onBack={() => setShowContact(false)}
        defaultName={ownerAccount?.name}
        defaultEmail={ownerAccount?.email}
      />
    )
  }

  return (
    <div
      className={`mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] print:max-w-none print:bg-white print:pb-0 ${
        isSecondaryTab ? 'pb-8' : 'pb-24'
      }`}
    >
      <div className="print:hidden">
        <Header
          subtitle={SUBTITLES[activeTab] ?? SUBTITLES.today}
          menuItems={menuItems}
          menuBadge={accountIncomplete}
          onBack={isSecondaryTab ? leaveSecondaryTab : undefined}
        />
      </div>

      <main className="space-y-4 px-4 print:space-y-0 print:px-0">
        {activeTab === 'today' ? <IosInstallHint /> : null}
        {activeTab === 'today' ? <HomeScreenBadgePrompt /> : null}
        {activeTab === 'today' && (
          <TodayView
            onLog={() => openLogSheet({ source: 'Today' })}
            onEditLog={(log) => openLogSheet({ edit: log, source: 'Today' })}
            onAddDog={openAddDog}
            onOpenPack={() => handleTabChange('pack')}
            onEditMenu={openMenuEditor}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            onEditLog={(log) => openLogSheet({ edit: log, source: 'Search' })}
          />
        )}

        {activeTab === 'pack' && (
          <DogsOverview
            addingNew={addingNewDog}
            onAddNew={() => {
              track('open_add_dog', { source: 'Pack' })
              setAddingNewDog(true)
            }}
            onCancelAdd={() => {
              track('cancel_add_dog', { source: 'Pack' })
              setAddingNewDog(false)
            }}
            onAdded={(dogId, options) => {
              setAddingNewDog(false)
              const next = options?.next ?? 'menu'
              if (!dogId) return
              if (next === 'today') {
                setActiveTab('today')
                return
              }
              // Menu is the onboarding goal when they choose meal plan
              // (and for “Add another dog”, which still opens the editor).
              setNewDogMenu(true)
              openMenuEditor(dogId)
            }}
            onEditMenu={openMenuEditor}
            onPrintCareGuide={openCareGuide}
            onShowTradingCard={openTradingCard}
          />
        )}

        {activeTab === 'pantry' && <CatalogTab />}

        {activeTab === 'care' && <CareGuideTab />}
      </main>

      <div className="print:hidden">
        {!isSecondaryTab ? (
          <Navigation
            activeTab={activeTab}
            onChange={handleTabChange}
            onLog={() => openLogSheet({ source: 'Navigation' })}
          />
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
      <TradingCardSheet
        open={Boolean(tradingCardDogId)}
        dog={dogs.find((d) => d.id === tradingCardDogId) ?? null}
        onClose={() => setTradingCardDogId(null)}
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
          if (menuDogId) track('close_routine_editor')
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
