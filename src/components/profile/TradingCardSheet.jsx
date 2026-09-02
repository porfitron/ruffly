import { Fragment, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Share } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import BrandMark from '../ui/BrandMark'
import DogAvatar from './DogAvatar'
import { slugifyName } from '../../utils/dogs'
import {
  shareCardScreenshot,
  sharePreparedLog,
} from '../../utils/shareToday'
import { shareResultLabel, track, trackException } from '../../analytics'

const CREAM = '#FBF9F5'
const LBS_PER_KG = 2.2046226218

const FAVORITE_ROWS = [
  { key: 'foodTreat', label: 'Food / Treat' },
  { key: 'toyGame', label: 'Toy / Game' },
  { key: 'furiends', label: 'Furiends' },
]

const DISLIKE_ROWS = [
  { key: 'people', label: 'People' },
  { key: 'places', label: 'Places' },
  { key: 'things', label: 'Things' },
]

function formatWeightLbs(dog) {
  const n = Number(dog?.weight)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const unit = dog?.weightUnit || 'lbs'
  const lbs = unit === 'kg' ? n * LBS_PER_KG : n
  const rounded = Math.round(lbs * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} lbs`
}

function formatAge(dog) {
  const n = Number(dog?.ageYears)
  if (!Number.isFinite(n) || n < 0) return '—'
  const text = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
  return n === 1 ? `${text} yr` : `${text} yrs`
}

function formatStatText(value) {
  if (typeof value !== 'string') return '—'
  const trimmed = value.trim()
  return trimmed || '—'
}

function noteValue(group, key) {
  const value = group?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : '—'
}

function tradingCardFilename(name) {
  const day = new Date()
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  const base = slugifyName(name) || 'pup'
  return `ruffly-card-${base}-${y}-${m}-${d}.png`
}

function StatTile({ label, value }) {
  const long = typeof value === 'string' && value.length > 12
  return (
    <div className="rounded-2xl bg-white/90 px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 font-extrabold leading-5 text-slate-800 ${
          long ? 'text-sm' : 'text-lg leading-6'
        }`}
        style={{ overflowWrap: 'break-word' }}
      >
        {value}
      </p>
    </div>
  )
}

function NoteSection({ title, rows, group }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#F59E0B]">
        {title}
      </h3>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2.5">
        {rows.map(({ key, label }) => (
          <Fragment key={key}>
            <dt className="whitespace-nowrap text-xs font-semibold leading-5 text-slate-400">
              {label}
            </dt>
            <dd
              className="text-sm font-medium text-slate-800"
              style={{ lineHeight: '20px', overflowWrap: 'break-word' }}
            >
              {noteValue(group, key)}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  )
}

function TradingCard({
  dog,
  cardRef,
  onShare,
  sharing,
  forCapture = false,
}) {
  const name = dog?.name?.trim() || 'Pup'
  return (
    <div
      ref={cardRef}
      className={`relative rounded-[1.75rem] border-4 border-amber-300 px-5 pb-5 pt-4 ${
        forCapture ? '' : 'mx-auto w-full max-w-[340px]'
      }`}
      style={{
        backgroundColor: CREAM,
        boxSizing: 'border-box',
        ...(forCapture ? { width: 340 } : {}),
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-8 w-8" />
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs font-extrabold leading-4 text-[#F59E0B]">
              Ruffly
            </p>
            <p className="whitespace-nowrap text-[11px] leading-4 text-slate-400">
              Trading card
            </p>
          </div>
        </div>
        {onShare ? (
          <button
            type="button"
            className="share-hide flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#F59E0B] hover:bg-amber-50 disabled:opacity-50"
            onClick={onShare}
            disabled={sharing}
            aria-label={`Share ${name}’s trading card`}
          >
            <Share size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col items-center">
        <DogAvatar name={name} photoUrl={dog?.photoUrl} size="xl" ring />
        <p className="mt-3 text-center text-xl font-extrabold tracking-tight text-slate-800">
          {name}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile label="Weight" value={formatWeightLbs(dog)} />
        <StatTile label="Age" value={formatAge(dog)} />
        <StatTile label="Color" value={formatStatText(dog?.colors)} />
        <StatTile label="Breed" value={formatStatText(dog?.breed)} />
      </div>

      <div className="mt-4 space-y-4 rounded-2xl bg-white px-3.5 py-3.5">
        <NoteSection
          title="Favorites"
          rows={FAVORITE_ROWS}
          group={dog?.favorites}
        />
        <div className="border-t border-amber-100" />
        <NoteSection
          title="Dislikes"
          rows={DISLIKE_ROWS}
          group={dog?.dislikes}
        />
      </div>

      <p className="pt-3 text-center text-[11px] leading-4 text-slate-400">
        Shared from Ruffly.app
      </p>
    </div>
  )
}

/**
 * Profile trading card — weight, age, color, breed, favorites, dislikes, PNG share.
 */
export default function TradingCardSheet({ open, dog, onClose }) {
  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const [pendingShare, setPendingShare] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  const name = dog?.name?.trim() || 'Pup'

  async function handleShare() {
    if (sharing || !dog) return
    setError('')
    setPendingShare(null)
    flushSync(() => setSharing(true))
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    try {
      const result = await shareCardScreenshot(cardRef.current, {
        filename: tradingCardFilename(name),
        title: `${name}’s trading card · Ruffly`,
        scale: 3,
      })
      if (result?.status === 'needs-gesture') {
        setPendingShare(result)
        track('share_trading_card', {
          result: shareResultLabel('needs-gesture'),
        })
      } else if (result?.status === 'cancelled') {
        track('share_trading_card', { result: 'Cancelled' })
      } else {
        track('share_trading_card', {
          result: shareResultLabel(result?.status),
        })
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        track('share_trading_card', { result: 'Failed' })
        trackException('Share trading card failed')
        setError(err?.message || 'Couldn’t share the card. Try again.')
      }
    } finally {
      setSharing(false)
    }
  }

  function handlePendingShare() {
    const payload = pendingShare
    if (!payload) return
    sharePreparedLog(payload)
      .then((status) => {
        setPendingShare(null)
        track('share_trading_card', { result: shareResultLabel(status) })
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          track('share_trading_card', { result: 'Failed' })
          trackException('Share trading card failed')
          setError(err?.message || 'Couldn’t share the card. Try again.')
        }
      })
  }

  return (
    <>
      {sharing ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#FBF9F5]/80 print:hidden"
          role="status"
          aria-live="polite"
        >
          <p className="absolute top-[max(2rem,env(safe-area-inset-top))] text-sm font-semibold text-[#F59E0B]">
            Preparing card…
          </p>
          <TradingCard dog={dog} cardRef={cardRef} forCapture />
        </div>
      ) : null}

      <Modal open={open} title={`${name}’s trading card`} onClose={onClose}>
        {pendingShare ? (
          <>
            <p className="text-sm text-slate-500">
              Your trading card is ready. Tap Share to open your phone’s share
              sheet.
            </p>
            <Button className="mt-4 w-full" onClick={handlePendingShare}>
              Share
              <Share size={18} />
            </Button>
          </>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <TradingCard
              dog={dog}
              onShare={handleShare}
              sharing={sharing}
            />
            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  )
}
