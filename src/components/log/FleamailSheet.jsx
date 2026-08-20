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

const MESSAGE_MAX = 120
const CREAM = '#FBF9F5'

function preferredDogId(dogs, preferredId) {
  if (preferredId && dogs.some((d) => d.id === preferredId)) {
    return preferredId
  }
  return dogs[0]?.id ?? null
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
      <div className="rounded-2xl rounded-tl-md border border-amber-200 bg-white px-3.5 py-2.5 text-sm leading-snug break-words whitespace-pre-wrap text-slate-800">
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

function FleamailShareCard({ dog, message, sentAt, cardRef }) {
  const name = dog?.name?.trim() || 'Pup'
  return (
    <div
      ref={cardRef}
      className="w-[340px] px-6 py-6"
      style={{ backgroundColor: CREAM }}
    >
      <div className="flex items-center gap-3">
        <BrandMark className="h-10 w-10" />
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm font-extrabold leading-5 text-[#F59E0B]">
            Ruffly
          </p>
          <p className="whitespace-nowrap text-xs leading-5 text-slate-500">
            Fleamail from {name}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3">
        <DogAvatar name={name} photoUrl={dog?.photoUrl} size="xl" />
        <div className="min-w-0 flex-1 pt-1">
          <p className="mb-1.5 text-sm font-bold text-slate-800">{name}</p>
          <SpeechBubble>{message}</SpeechBubble>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
            {formatFleamailStamp(sentAt)}
          </p>
        </div>
      </div>

      <p className="pt-6 text-center text-xs leading-5 text-slate-400">
        Shared from Ruffly.app
      </p>
    </div>
  )
}

function fleamailFilename(name) {
  const day = new Date()
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  const base = slugifyName(name) || 'pup'
  return `ruffly-fleamail-${base}-${y}-${m}-${d}.png`
}

/** Compose a short note as a dog and share it as a PNG. */
export default function FleamailSheet({ open, onClose }) {
  const { dogs, activeDogId } = useApp()
  // Same order as Pack, including dogs marked away.
  const pack = dogs ?? []
  const cardRef = useRef(null)
  const [dogId, setDogId] = useState(() =>
    preferredDogId(pack, activeDogId),
  )
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentAt, setSentAt] = useState(() => new Date())
  const [pendingShare, setPendingShare] = useState(null)
  const [error, setError] = useState('')

  const dog = pack.find((d) => d.id === dogId) ?? pack[0] ?? null
  const trimmed = message.trim()
  const canSend = Boolean(dog) && trimmed.length > 0 && !sending

  useEffect(() => {
    if (!open) return
    setDogId(preferredDogId(pack, activeDogId))
    setMessage('')
    setSending(false)
    setSentAt(new Date())
    setPendingShare(null)
    setError('')
    // Only reset when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSend() {
    if (!canSend || !dog) return
    setError('')
    setPendingShare(null)
    flushSync(() => {
      setSentAt(new Date())
      setSending(true)
    })
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    try {
      const result = await shareCardScreenshot(cardRef.current, {
        filename: fleamailFilename(dog.name),
        scale: 3,
      })
      if (result?.status === 'needs-gesture') {
        setPendingShare(result)
      } else if (result?.status === 'cancelled') {
        // Stay in the composer so they can try again.
      } else {
        onClose?.()
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
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
      .then(() => {
        setPendingShare(null)
        onClose?.()
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
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
            dog={dog}
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
              Write a short note as your pup — we’ll attach it as a photo.
            </p>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              {pack.length > 1 ? (
                <Field label="From">
                  <ul className="mt-1 space-y-1" role="listbox" aria-label="Dog">
                    {pack.map((d) => {
                      const selected = d.id === dog?.id
                      const away = isDogAway(d)
                      const name = d.name?.trim() || 'Unnamed'
                      return (
                        <li key={d.id} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => setDogId(d.id)}
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
                    name={dog?.name}
                    photoUrl={dog?.photoUrl}
                    size="sm"
                  />
                  <p className="text-sm font-semibold text-slate-800">
                    From {dog?.name?.trim() || 'your pup'}
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

              {trimmed ? (
                <div className="flex items-start gap-3 rounded-2xl bg-[#FBF9F5] px-3 py-3">
                  <DogAvatar
                    name={dog?.name}
                    photoUrl={dog?.photoUrl}
                    size="sm"
                  />
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
