import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Share } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import BrandMark from '../ui/BrandMark'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import { isDogAway, slugifyName } from '../../utils/dogs'
import {
  shareCardScreenshot,
  sharePreparedLog,
} from '../../utils/shareToday'
import { shareResultLabel, track, trackException } from '../../analytics'

const MESSAGE_MAX = 120
const CREAM = '#FBF9F5'

function preferredDogId(dogs, preferredId) {
  if (preferredId && dogs.some((d) => d.id === preferredId)) {
    return preferredId
  }
  return dogs[0]?.id ?? null
}

function preferredDogIds(dogs, preferredId) {
  const id = preferredDogId(dogs, preferredId)
  return id ? [id] : []
}

function toggleDogId(ids, id) {
  if (ids.includes(id)) {
    if (ids.length <= 1) return ids
    return ids.filter((value) => value !== id)
  }
  return [...ids, id]
}

function formatPackNames(dogs) {
  const names = (dogs ?? []).map((dog) => dog?.name?.trim() || 'Pup')
  if (names.length === 0) return 'Pup'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

function stackAvatarSize(count) {
  if (count >= 5) return 'sm'
  if (count >= 3) return 'lg'
  return 'xl'
}

function stackOverlapClass(size) {
  if (size === 'xl') return '-ml-5'
  if (size === 'lg') return '-ml-4'
  return '-ml-3'
}

function AvatarStack({ dogs, size = 'sm' }) {
  const pack = dogs ?? []
  const overlap = stackOverlapClass(size)
  const outline =
    pack.length > 1
      ? size === 'sm'
        ? 'ring-2 ring-white'
        : 'ring-[3px] ring-white'
      : ''

  return (
    <div className="flex shrink-0 items-center">
      {pack.map((dog, i) => (
        <div
          key={dog.id}
          className={`relative ${i > 0 ? overlap : ''}`}
          style={{ zIndex: i + 1 }}
        >
          <DogAvatar
            name={dog.name}
            photoUrl={dog.photoUrl}
            size={size}
            className={outline}
          />
        </div>
      ))}
    </div>
  )
}

function SpeechBubble({ children }) {
  return (
    <div className="relative min-w-0 flex-1">
      <div
        className="absolute -left-2 top-3 h-0 w-0 border-y-[7px] border-r-[8px] border-y-transparent border-r-amber-200"
        aria-hidden
      />
      <div
        className="absolute -left-[6px] top-3 h-0 w-0 border-y-[7px] border-r-[8px] border-y-transparent border-r-white"
        aria-hidden
      />
      <div className="overflow-hidden rounded-2xl rounded-tl-md border border-amber-200 bg-white px-3.5 py-2.5 text-sm leading-snug wrap-break-word whitespace-pre-wrap text-slate-800 [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  )
}

function formatFleamailStamp(day = new Date()) {
  const date = day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = day.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

function FleamailShareCard({ dogs, message, sentAt, cardRef }) {
  const pack = dogs ?? []
  const names = formatPackNames(pack)
  const avatarSize = stackAvatarSize(pack.length)
  return (
    <div
      ref={cardRef}
      className="w-[340px] px-6 py-6"
      style={{ backgroundColor: CREAM }}
    >
      <div className="flex items-center gap-3">
        <BrandMark className="h-10 w-10 shrink-0" />
        <p className="whitespace-nowrap text-sm font-extrabold leading-5 text-[#F59E0B]">
          Ruffly
        </p>
      </div>
      <p className="mt-1 whitespace-nowrap text-xs leading-5 text-slate-500">
        Fleamail from {names}
      </p>

      <div className="mt-6 flex items-start gap-3">
        <AvatarStack dogs={pack} size={avatarSize} />
        <div className="min-w-0 flex-1 pt-1">
          <p className="mb-1.5 text-sm font-bold text-slate-800">{names}</p>
          <SpeechBubble>{message}</SpeechBubble>
        </div>
      </div>
      <p className="mt-1.5 whitespace-nowrap text-right text-[11px] leading-4 text-slate-400">
        {formatFleamailStamp(sentAt)}
      </p>

      <p className="pt-6 text-center text-xs leading-5 text-slate-400">
        Shared from Ruffly.app
      </p>
    </div>
  )
}

function recordFleamailSent(dispatch, dogs, message, sentAt) {
  if (!dispatch) return
  const loggedAt =
    sentAt instanceof Date
      ? sentAt.toISOString()
      : sentAt || new Date().toISOString()
  for (const dog of dogs ?? []) {
    if (!dog?.id) continue
    dispatch({
      type: 'ADD_LOG',
      payload: {
        dogId: dog.id,
        kind: 'fleamail',
        note: message,
        loggedAt,
      },
    })
  }
}

function fleamailFilename(dogs) {
  const day = new Date()
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  const slugs = (dogs ?? [])
    .map((dog) => slugifyName(dog?.name))
    .filter(Boolean)
  const base =
    slugs.length === 0
      ? 'pup'
      : slugs.length === 1
        ? slugs[0]
        : slugs.length <= 3
          ? slugs.join('-')
          : 'pack'
  return `ruffly-fleamail-${base}-${y}-${m}-${d}.png`
}

/** Compose a short note as a dog and share it as a PNG. */
export default function FleamailSheet({ open, onClose }) {
  const { dogs, activeDogId, dispatch } = useApp()
  // Same order as Pack, including dogs marked away.
  const pack = dogs ?? []
  const cardRef = useRef(null)
  const [dogIds, setDogIds] = useState(() =>
    preferredDogIds(pack, activeDogId),
  )
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentAt, setSentAt] = useState(() => new Date())
  const [pendingShare, setPendingShare] = useState(null)
  const [error, setError] = useState('')

  const selectedDogs = pack.filter((d) => dogIds.includes(d.id))
  const trimmed = message.trim()
  const canSend = selectedDogs.length > 0 && trimmed.length > 0 && !sending

  useEffect(() => {
    if (!open) return
    setDogIds(preferredDogIds(pack, activeDogId))
    setMessage('')
    setSending(false)
    setSentAt(new Date())
    setPendingShare(null)
    setError('')
    // Only reset when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSend() {
    if (!canSend) return
    setError('')
    setPendingShare(null)
    const stampedAt = new Date()
    flushSync(() => {
      setSentAt(stampedAt)
      setSending(true)
    })
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    try {
      const result = await shareCardScreenshot(cardRef.current, {
        filename: fleamailFilename(selectedDogs),
        scale: 3,
      })
      if (result?.status === 'needs-gesture') {
        setPendingShare(result)
        track('send_fleamail', { result: shareResultLabel('needs-gesture') })
      } else if (result?.status === 'cancelled') {
        track('send_fleamail', { result: 'Cancelled' })
        // Stay in the composer so they can try again.
      } else {
        recordFleamailSent(dispatch, selectedDogs, trimmed, stampedAt)
        track('send_fleamail', {
          result: shareResultLabel(result?.status),
          item_count: selectedDogs.length,
        })
        onClose?.()
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        track('send_fleamail', { result: 'Failed' })
        trackException('Fleamail failed')
        setError(err?.message || 'Couldn’t send Fleamail. Try again.')
      }
    } finally {
      setSending(false)
    }
  }

  function handlePendingShare() {
    const payload = pendingShare
    if (!payload) return
    sharePreparedLog(payload)
      .then((status) => {
        recordFleamailSent(dispatch, selectedDogs, trimmed, sentAt)
        setPendingShare(null)
        track('send_fleamail', {
          result: shareResultLabel(status),
          item_count: selectedDogs.length,
        })
        onClose?.()
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          track('send_fleamail', { result: 'Failed' })
          trackException('Fleamail failed')
          setError(err?.message || 'Couldn’t send Fleamail. Try again.')
        }
      })
  }

  if (!open) return null

  return (
    <>
      {sending ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#FBF9F5]/80 print:hidden"
          role="status"
          aria-live="polite"
        >
          <p className="absolute top-[max(2rem,env(safe-area-inset-top))] text-sm font-semibold text-[#F59E0B]">
            Preparing Fleamail…
          </p>
          <FleamailShareCard
            dogs={selectedDogs}
            message={trimmed}
            sentAt={sentAt}
            cardRef={cardRef}
          />
        </div>
      ) : null}

      <Modal open={open} title="Send Fleamail" onClose={onClose}>
        {pack.length === 0 ? (
          <>
            <p className="text-sm text-slate-500">
              Add a dog first, then they can send a Fleamail.
            </p>
            <Button className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </>
        ) : pendingShare ? (
          <>
            <p className="text-sm text-slate-500">
              Your Fleamail is ready. Tap Share to open your phone’s share
              sheet.
            </p>
            <Button className="mt-4 w-full" onClick={handlePendingShare}>
              Share
              <Share size={18} />
            </Button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {pack.length > 1
                ? 'Write a short note as your pup — tap more than one to send it together.'
                : 'Write a short note as your pup — we’ll attach it as a photo.'}
            </p>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              {pack.length > 1 ? (
                <Field
                  label="From"
                  hint="Tap to add or remove dogs."
                >
                  <ul
                    className="mt-1 space-y-1"
                    role="listbox"
                    aria-label="Dogs"
                    aria-multiselectable="true"
                  >
                    {pack.map((d) => {
                      const selected = dogIds.includes(d.id)
                      const away = isDogAway(d)
                      const name = d.name?.trim() || 'Unnamed'
                      return (
                        <li key={d.id} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() =>
                              setDogIds((ids) => toggleDogId(ids, d.id))
                            }
                            className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors ${
                              selected
                                ? 'bg-amber-50 ring-1 ring-amber-200'
                                : 'bg-[#FBF9F5] hover:bg-amber-50/80'
                            }`}
                          >
                            <DogAvatar
                              name={name}
                              photoUrl={d.photoUrl}
                              size="sm"
                              ring={selected}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                              {name}
                            </span>
                            {away ? (
                              <span className="shrink-0 text-xs font-medium text-slate-400">
                                away
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </Field>
              ) : (
                <div className="flex items-center gap-3">
                  <DogAvatar
                    name={selectedDogs[0]?.name}
                    photoUrl={selectedDogs[0]?.photoUrl}
                    size="sm"
                  />
                  <p className="text-sm font-semibold text-slate-800">
                    From {selectedDogs[0]?.name?.trim() || 'your pup'}
                  </p>
                </div>
              )}

              <Field
                label="Message"
                htmlFor="fleamail-message"
                hint={`${message.length}/${MESSAGE_MAX}`}
              >
                <textarea
                  id="fleamail-message"
                  className={`${fieldClassName} h-28 resize-none py-3`}
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                  placeholder="Walkies were great. Can I have a treat?"
                  autoFocus
                />
              </Field>

              {trimmed && selectedDogs.length > 0 ? (
                <div className="flex items-start gap-3 rounded-2xl bg-[#FBF9F5] px-3 py-3">
                  <AvatarStack dogs={selectedDogs} size="sm" />
                  <SpeechBubble>{trimmed}</SpeechBubble>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!canSend}
                onClick={handleSend}
              >
                Send
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
