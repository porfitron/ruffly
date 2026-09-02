import { useEffect, useState } from 'react'
import {
  ClipboardList,
  GripVertical,
  IdCard,
  Pencil,
  Printer,
} from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { Field, SegmentedControl } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { useHoldReorder } from '../../hooks/useHoldReorder'
import { getDogProfileCompletion } from '../../utils/storage'
import {
  cycleDogPresence,
  dogPresence,
  presenceLabel,
  presencePatch,
} from '../../utils/dogs'
import { track } from '../../analytics'
import DogSummaryCard from './DogSummaryCard'
import ProfileEditor from './ProfileEditor'
import DogOnboarding from '../onboarding/DogOnboarding'

const PRESENCE_OPTIONS = [
  { value: 'tracking', label: 'Tracking' },
  { value: 'active', label: 'Active' },
  { value: 'away', label: 'Away' },
]

function presenceHint(presence) {
  if (presence === 'away') {
    return 'Away dogs skip Today and logging until they’re back with you.'
  }
  if (presence === 'active') {
    return 'This pup appears on Today without a checklist. Log with +.'
  }
  return 'Today shows this pup’s full routine to check off.'
}

function menuSnippet(menu, catalog) {
  if (!menu?.length) return 'No menu yet'
  const names = menu
    .map((item) => catalog.find((c) => c.id === item.careItemId)?.name)
    .filter(Boolean)
  if (names.length === 0)
    return `${menu.length} menu item${menu.length === 1 ? '' : 's'}`
  if (names.length <= 2) return names.join(' · ')
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2}`
}

function PackAction({ icon: Icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[6.5rem] flex-col items-start gap-2 rounded-2xl bg-[#FBF9F5] p-3 text-left transition-colors hover:bg-amber-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[#F59E0B]">
        <Icon size={18} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function DogPackDetail({
  dog,
  onEditMenu,
  onEditProfile,
  onPrintCareGuide,
  onShowTradingCard,
}) {
  const { catalog, menusByDogId, dispatch } = useApp()
  const menu = menusByDogId?.[dog.id] ?? []
  const completion = getDogProfileCompletion(dog)
  const presence = dogPresence(dog)
  const hasMenu = menu.length > 0

  function handlePresence(value) {
    dispatch({
      type: 'UPDATE_DOG_PROFILE',
      payload: { id: dog.id, ...presencePatch(value) },
    })
    track('set_dog_presence', {
      presence: presenceLabel(value),
      method: 'Pack detail',
    })
  }

  return (
    <Card className="!p-4 space-y-3">
      <Field
        label="Today status"
        hint={presenceHint(presence)}
      >
        <SegmentedControl
          value={presence}
          onChange={handlePresence}
          options={PRESENCE_OPTIONS}
          ariaLabel={`Today status for ${dog.name || 'this dog'}`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <PackAction
          icon={Pencil}
          label="Edit profile"
          hint={
            completion.isComplete
              ? 'Profile complete'
              : `${completion.percent}% complete`
          }
          onClick={onEditProfile}
        />
        <PackAction
          icon={ClipboardList}
          label={hasMenu ? 'Manage routine' : 'Create routine'}
          hint={menuSnippet(menu, catalog)}
          onClick={() => onEditMenu?.(dog.id)}
        />
        <PackAction
          icon={Printer}
          label="Print care guide"
          hint="Sitter notes as PDF"
          onClick={() => onPrintCareGuide?.(dog.id)}
        />
        <PackAction
          icon={IdCard}
          label="Trading card"
          hint="Display this pup’s card"
          onClick={() => onShowTradingCard?.(dog.id)}
        />
      </div>
    </Card>
  )
}

/** Pack tab — manage dogs (no “active” dog; details expand on tap). */
export default function DogsOverview({
  addingNew,
  onAddNew,
  onCancelAdd,
  onAdded,
  onEditMenu,
  onPrintCareGuide,
  onShowTradingCard,
}) {
  const { dogs, dispatch } = useApp()
  const [expandedDogId, setExpandedDogId] = useState(null)
  const [editingDogId, setEditingDogId] = useState(null)
  const canReorder = dogs.length > 1
  const { currentIds, draggingId, setItemRef, bindHandle } = useHoldReorder({
    ids: dogs.map((dog) => dog.id),
    enabled: canReorder,
    onStart: () => {
      setExpandedDogId(null)
      setEditingDogId(null)
    },
    onCommit: (orderedIds) => {
      dispatch({ type: 'REORDER_DOGS', payload: orderedIds })
    },
  })
  const dogsById = new Map(dogs.map((dog) => [dog.id, dog]))
  const orderedDogs = currentIds
    .map((id) => dogsById.get(id))
    .filter(Boolean)

  useEffect(() => {
    if (dogs.length === 0 && !addingNew) {
      track('open_add_dog', { source: 'First dog' })
    }
  }, [dogs.length, addingNew])

  function handleSelect(id) {
    setEditingDogId(null)
    setExpandedDogId((current) => (current === id ? null : id))
  }

  function handleOnboardingComplete({ dogId, next }) {
    setExpandedDogId(null)
    setEditingDogId(null)
    onAdded?.(dogId, { next })
  }

  if (dogs.length === 0 || addingNew) {
    return (
      <div className="space-y-3">
        {addingNew && dogs.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">Add another pup</h2>
            <Button variant="ghost" className="!h-10 px-3" onClick={onCancelAdd}>
              Cancel
            </Button>
          </div>
        ) : null}
        <DogOnboarding onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-0.5">
        <h2 className="text-lg font-bold text-slate-800">Your pack</h2>
        <p className="text-sm text-slate-500">
          {canReorder
            ? 'Tap a dog for Today status and shortcuts. Hold the grip to reorder.'
            : 'Tap a dog for Today status and shortcuts. Set tracking, active, or away.'}
        </p>
      </div>

      <ul className={`space-y-2 ${draggingId ? 'select-none' : ''}`}>
        {orderedDogs.map((dog) => {
          const expanded = dog.id === expandedDogId && !draggingId
          const editing = dog.id === editingDogId && !draggingId
          const name = dog.name?.trim() || 'Unnamed'
          return (
            <li
              key={dog.id}
              ref={(node) => setItemRef(dog.id, node)}
              className={expanded ? 'space-y-2' : undefined}
            >
              <DogSummaryCard
                dog={dog}
                active={false}
                selected={expanded}
                expanded={expanded}
                portionSnippet={null}
                showPresence
                dragging={dog.id === draggingId}
                reorderHandle={
                  canReorder ? (
                    <button
                      type="button"
                      className={`flex h-11 w-8 shrink-0 items-center justify-center select-none [-webkit-touch-callout:none] hover:text-slate-400 ${
                        dog.id === draggingId
                          ? 'cursor-grabbing touch-none text-slate-400'
                          : 'cursor-grab touch-manipulation text-slate-300'
                      }`}
                      aria-label={`Hold and drag to reorder ${name}`}
                      aria-grabbed={dog.id === draggingId}
                      {...bindHandle(dog.id)}
                    >
                      <GripVertical size={18} strokeWidth={2.5} aria-hidden />
                    </button>
                  ) : null
                }
                onSelect={() => handleSelect(dog.id)}
                onTogglePresence={() => {
                  const next = cycleDogPresence(dog)
                  dispatch({
                    type: 'UPDATE_DOG_PROFILE',
                    payload: { id: dog.id, ...presencePatch(next) },
                  })
                  track('set_dog_presence', {
                    presence: presenceLabel(next),
                    method: 'Pack card',
                  })
                }}
              />
              {expanded ? (
                editing ? (
                  <ProfileEditor
                    dogId={dog.id}
                    onAdded={() => setEditingDogId(null)}
                    onCancel={() => setEditingDogId(null)}
                  />
                ) : (
                  <DogPackDetail
                    dog={dog}
                    onEditMenu={onEditMenu}
                    onEditProfile={() => setEditingDogId(dog.id)}
                    onPrintCareGuide={onPrintCareGuide}
                    onShowTradingCard={onShowTradingCard}
                  />
                )
              ) : null}
            </li>
          )
        })}
      </ul>

      <Button variant="secondary" className="w-full !h-11" onClick={onAddNew}>
        + Add another dog
      </Button>
    </div>
  )
}
