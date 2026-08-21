import { useEffect, useState } from 'react'
import { GripVertical } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { Field, SegmentedControl } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { useHoldReorder } from '../../hooks/useHoldReorder'
import { getDogProfileCompletion } from '../../utils/storage'
import { kindLabel } from '../../utils/todayCare'
import { isDogAway } from '../../utils/dogs'
import { track } from '../../analytics'
import DogSummaryCard from './DogSummaryCard'
import ProfileEditor from './ProfileEditor'

const PRESENCE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
]

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

function DogPackDetail({ dog, onEditMenu, onEditProfile }) {
  const { catalog, menusByDogId, dispatch } = useApp()
  const menu = menusByDogId?.[dog.id] ?? []
  const completion = getDogProfileCompletion(dog)
  const missing = completion.fields.filter((f) => !f.done)
  const away = isDogAway(dog)

  function handlePresence(value) {
    dispatch({
      type: 'UPDATE_DOG_PROFILE',
      payload: { id: dog.id, away: value === 'away' },
    })
    track('set_dog_presence', {
      presence: value === 'away' ? 'Away' : 'Home',
      method: 'Pack detail',
    })
  }

  return (
    <Card className="!p-4 space-y-3">
      <Field
        label="Routine"
        hint={
          away
            ? 'Away dogs skip Today until you mark them home.'
            : 'Pause the routine when this pup isn’t with you.'
        }
      >
        <SegmentedControl
          value={away ? 'away' : 'home'}
          onChange={handlePresence}
          options={PRESENCE_OPTIONS}
          ariaLabel={`Routine for ${dog.name || 'this dog'}`}
        />
      </Field>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Daily menu</p>
          <p className="text-xs text-slate-400">{menuSnippet(menu, catalog)}</p>
        </div>
        <Button
          variant="secondary"
          className="!h-10 shrink-0 px-3"
          onClick={() => onEditMenu?.(dog.id)}
        >
          {menu.length ? 'Edit routine' : 'Set up menu'}
        </Button>
      </div>

      {menu.length > 0 ? (
        <ul className="space-y-1.5">
          {menu.slice(0, 4).map((item) => {
            const care = catalog.find((c) => c.id === item.careItemId)
            return (
              <li
                key={item.id}
                className="flex justify-between gap-2 rounded-xl bg-[#FBF9F5] px-3 py-2 text-xs"
              >
                <span className="truncate font-medium text-slate-700">
                  {care?.name ?? 'Item'}
                </span>
                <span className="shrink-0 text-slate-400">
                  {kindLabel(care?.kind ?? 'food')} · {item.slot}
                </span>
              </li>
            )
          })}
          {menu.length > 4 ? (
            <li className="px-1 text-xs text-slate-400">
              +{menu.length - 4} more
            </li>
          ) : null}
        </ul>
      ) : null}

      {missing.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-600">
            Profile {completion.doneCount}/{completion.total} complete
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Still open: {missing.map((m) => m.label).join(', ')}
          </p>
        </div>
      ) : (
        <p className="text-xs font-medium text-[#10B981]">Profile complete</p>
      )}

      <Button variant="ghost" className="w-full !h-10" onClick={onEditProfile}>
        Edit profile
      </Button>
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

  function handleAdded(dogId) {
    setExpandedDogId(null)
    setEditingDogId(null)
    onAdded?.(dogId)
  }

  if (addingNew) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Add another pup</h2>
          <Button variant="ghost" className="!h-10 px-3" onClick={onCancelAdd}>
            Cancel
          </Button>
        </div>
        <ProfileEditor addingNew onAdded={handleAdded} />
      </div>
    )
  }

  if (dogs.length === 0) {
    return (
      <div className="space-y-3">
        <ProfileEditor onAdded={handleAdded} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-0.5">
        <h2 className="text-lg font-bold text-slate-800">Your pack</h2>
        <p className="text-sm text-slate-500">
          {canReorder
            ? 'Tap a dog for menu and profile. Hold the grip to reorder.'
            : 'Tap a dog for menu and profile. Pause visiting pups when they’re away.'}
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
                  const nextAway = !isDogAway(dog)
                  dispatch({
                    type: 'UPDATE_DOG_PROFILE',
                    payload: { id: dog.id, away: nextAway },
                  })
                  track('set_dog_presence', {
                    presence: nextAway ? 'Away' : 'Home',
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
