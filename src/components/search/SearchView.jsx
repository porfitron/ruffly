import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChevronDown, Search, Share } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import BrandMark from '../ui/BrandMark'
import { fieldClassName } from '../ui/Field'
import DateRangeSlider, { DATE_RANGE_DAYS } from '../ui/DateRangeSlider'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import { foodListLabel } from '../catalog/FoodCreateFields'
import {
  formatPackUpdateDate,
  shareCardScreenshot,
  sharePreparedLog,
} from '../../utils/shareToday'
import { shareResultLabel, track, trackException } from '../../analytics'
import {
  addLocalDays,
  formatLogTime,
  isSameLocalDay,
  kindLabel,
  startOfLocalDay,
} from '../../utils/todayCare'

const KIND_FILTERS = [
  { value: 'food', label: 'Food' },
  { value: 'med', label: 'Medication' },
  { value: 'supplement', label: 'Supplements' },
  { value: 'weight', label: 'Weigh-ins' },
  { value: 'activity', label: 'Activity' },
  { value: 'note', label: 'Notes' },
  { value: 'fleamail', label: 'Fleamails' },
]

const PAGE_SIZE = 50
/** Keep shared screenshots readable (and inside iOS canvas limits). */
const SHARE_LIMIT = 20
/** Date range slider stops: 14 days back through today. */
const RANGE_DAYS = DATE_RANGE_DAYS

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 rounded-full px-3.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[#F59E0B] text-white shadow-sm'
          : 'bg-[#FBF9F5] text-slate-500 ring-1 ring-amber-200 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function DogPill({ dog, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[#F59E0B] text-white shadow-sm'
          : 'bg-[#FBF9F5] text-slate-500 ring-1 ring-amber-200 hover:text-slate-700'
      }`}
    >
      <DogAvatar name={dog.name} photoUrl={dog.photoUrl} size="xs" />
      <span className="max-w-28 truncate">{dog.name?.trim() || 'Pup'}</span>
    </button>
  )
}

function logTitle(log, careItem) {
  if (log.kind === 'weight') return 'Weigh-in'
  if (log.kind === 'activity') return log.label?.trim() || 'Activity'
  if (log.kind === 'note') return log.label?.trim() || 'Note'
  if (log.kind === 'fleamail') return 'Fleamail'
  if (!careItem) return kindLabel(log.kind)
  if (careItem.kind === 'food') return foodListLabel(careItem)
  return [careItem.brand?.trim(), careItem.name?.trim()]
    .filter(Boolean)
    .join(' · ')
}

function amountLabel(log) {
  if (log.amount == null || log.amount === '') return ''
  return `${log.amount}${log.unit ? ` ${log.unit}` : ''}`
}

/** "Today" / "Yesterday", else a short local date. */
function dayLabel(isoOrDate) {
  const day = startOfLocalDay(new Date(isoOrDate))
  if (isSameLocalDay(day)) return 'Today'
  if (isSameLocalDay(day, addLocalDays(new Date(), -1))) return 'Yesterday'
  return day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year:
      day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

/** Short label for a slider stop, where RANGE_DAYS is today. */
function rangeStopLabel(index) {
  if (index === RANGE_DAYS) return 'Today'
  if (index === RANGE_DAYS - 1) return 'Yesterday'
  return addLocalDays(startOfLocalDay(), index - RANGE_DAYS).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' },
  )
}

function localIsoDate(day = new Date()) {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Split already-sorted entries into consecutive local-day sections. */
function groupByDay(entries) {
  const days = []
  for (const entry of entries) {
    const key = startOfLocalDay(new Date(entry.log.loggedAt)).getTime()
    const last = days[days.length - 1]
    if (last && last.key === key) last.entries.push(entry)
    else days.push({ key, label: dayLabel(entry.log.loggedAt), entries: [entry] })
  }
  return days
}

function ResultRow({ entry, onEditLog }) {
  const { log, dog, title, note } = entry
  const meta = [kindLabel(log.kind), amountLabel(log)]
  if (log.kind === 'food' && log.kcal) meta.push(`${Math.round(log.kcal)} kcal`)
  if (note && note !== title) meta.push(note)
  const editable =
    (log.kind === 'note' || log.kind === 'weight') && Boolean(onEditLog)

  const body = (
    <>
      <DogAvatar name={dog?.name ?? ''} photoUrl={dog?.photoUrl} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
        <p className="line-clamp-2 text-xs text-slate-400">
          {[dog?.name?.trim(), ...meta].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-slate-400">
        {formatLogTime(log.loggedAt)}
      </span>
    </>
  )

  return (
    <li className="rounded-2xl border border-amber-100 bg-[#FBF9F5]">
      {editable ? (
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
          onClick={() => onEditLog(log)}
          aria-label={
            log.kind === 'weight'
              ? `Edit weigh-in ${title}`
              : `Edit note ${title}`
          }
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
      )}
    </li>
  )
}

function DayGroup({ day, onEditLog }) {
  return (
    <Card className="!p-4">
      <h3 className="mb-3 font-bold text-slate-800">{day.label}</h3>
      <ul className="space-y-2">
        {day.entries.map((entry) => (
          <ResultRow key={entry.log.id} entry={entry} onEditLog={onEditLog} />
        ))}
      </ul>
    </Card>
  )
}

/** Off-screen branded card that becomes the shared screenshot. */
function SearchShareCard({ cardRef, days, headline, hiddenCount }) {
  return (
    <div
      className="pointer-events-none fixed left-[-9999px] top-0 print:hidden"
      aria-hidden
    >
      <div ref={cardRef} className="w-[420px] space-y-4 bg-[#FBF9F5] px-5 py-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div className="min-w-0">
            <p className="whitespace-nowrap text-sm font-extrabold leading-5 text-[#F59E0B]">
              Ruffly
            </p>
            <p className="text-xs leading-5 text-slate-500">{headline}</p>
          </div>
        </div>
        {days.map((day) => (
          <DayGroup key={day.key} day={day} />
        ))}
        {hiddenCount > 0 ? (
          <p className="text-center text-xs leading-5 text-slate-400">
            + {hiddenCount} more in Ruffly
          </p>
        ) : null}
        <p className="pt-1 text-center text-xs leading-5 text-slate-400">
          Search results from Ruffly.app
        </p>
      </div>
    </div>
  )
}

/** Search every log — food, meds, supplements, weigh-ins, activity, notes, Fleamails. */
export default function SearchView({ onEditLog }) {
  const { logs, catalog, dogs } = useApp()
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState([])
  const [dogIds, setDogIds] = useState([])
  const [range, setRange] = useState([0, RANGE_DAYS])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [pendingShare, setPendingShare] = useState(null)
  const shareCardRef = useRef(null)

  const entries = useMemo(() => {
    const itemById = new Map((catalog ?? []).map((item) => [item.id, item]))
    const dogById = new Map((dogs ?? []).map((dog) => [dog.id, dog]))
    return (logs ?? [])
      .map((log) => {
        const careItem = log.careItemId ? itemById.get(log.careItemId) : null
        const dog = dogById.get(log.dogId) ?? null
        const title = logTitle(log, careItem)
        const note = log.note?.trim() ?? ''
        return {
          log,
          dog,
          title,
          note,
          time: new Date(log.loggedAt ?? 0).getTime() || 0,
          haystack: [
            title,
            note,
            log.label,
            log.unit,
            dog?.name,
            kindLabel(log.kind),
            careItem?.brand,
            careItem?.name,
            careItem?.formula,
            careItem?.flavor,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        }
      })
      .sort((a, b) => b.time - a.time)
  }, [logs, catalog, dogs])

  /** Ignore dogs that left the pack while their pill was selected. */
  const dogFilterIds = useMemo(
    () => dogIds.filter((id) => (dogs ?? []).some((dog) => dog.id === id)),
    [dogIds, dogs],
  )

  const [rangeStart, rangeEnd] = range
  /** Leftmost stop means "no earlier bound", so old logs stay searchable. */
  const rangeBounds = useMemo(() => {
    const today = startOfLocalDay()
    return {
      from:
        rangeStart === 0
          ? null
          : addLocalDays(today, rangeStart - RANGE_DAYS).getTime(),
      to:
        rangeEnd === RANGE_DAYS
          ? null
          : addLocalDays(today, rangeEnd - RANGE_DAYS + 1).getTime() - 1,
    }
  }, [rangeStart, rangeEnd])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .filter((entry) => kinds.length === 0 || kinds.includes(entry.log.kind))
      .filter(
        (entry) =>
          dogFilterIds.length === 0 || dogFilterIds.includes(entry.log.dogId),
      )
      .filter(
        (entry) =>
          (rangeBounds.from == null || entry.time >= rangeBounds.from) &&
          (rangeBounds.to == null || entry.time <= rangeBounds.to),
      )
      .filter((entry) => !q || entry.haystack.includes(q))
  }, [entries, dogFilterIds, kinds, query, rangeBounds])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [query, kinds, dogIds, range])

  const days = useMemo(
    () => groupByDay(filtered.slice(0, visible)),
    [filtered, visible],
  )
  const shareDays = useMemo(
    () => groupByDay(filtered.slice(0, SHARE_LIMIT)),
    [filtered],
  )

  function toggleKind(kind) {
    setKinds((current) =>
      current.includes(kind)
        ? current.filter((value) => value !== kind)
        : [...current, kind],
    )
  }

  function toggleDog(dogId) {
    setDogIds((current) =>
      current.includes(dogId)
        ? current.filter((value) => value !== dogId)
        : [...current, dogId],
    )
  }

  const canFilterByDog = (dogs ?? []).length > 1
  const rangeActive = rangeStart > 0 || rangeEnd < RANGE_DAYS
  const filtering =
    Boolean(query.trim()) ||
    kinds.length > 0 ||
    dogFilterIds.length > 0 ||
    rangeActive
  const kindsSummary =
    kinds.length === 0
      ? 'All types'
      : KIND_FILTERS.filter((filter) => kinds.includes(filter.value))
          .map((filter) => filter.label)
          .join(' · ')
  const dogsSummary =
    dogFilterIds.length === 0
      ? canFilterByDog
        ? 'All dogs'
        : ''
      : (dogs ?? [])
          .filter((dog) => dogFilterIds.includes(dog.id))
          .map((dog) => dog.name?.trim() || 'Pup')
          .join(' · ')
  const rangeStartLabel =
    rangeStart === 0 ? 'Any date' : rangeStopLabel(rangeStart)
  const rangeEndLabel = rangeStopLabel(rangeEnd)
  const rangeSummary = !rangeActive
    ? 'Any date'
    : rangeStart === 0
      ? `Through ${rangeEndLabel}`
      : `${rangeStartLabel} – ${rangeEndLabel}`
  const filtersSummary = [kindsSummary, dogsSummary, rangeSummary]
    .filter(Boolean)
    .join(' · ')
  const countLabel = filtering
    ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
    : `${filtered.length} log${filtered.length === 1 ? '' : 's'}`
  const searchedFor = [
    query.trim() ? `“${query.trim()}”` : null,
    kinds.length > 0 ? kindsSummary : null,
    dogFilterIds.length > 0 ? dogsSummary : null,
    rangeActive
      ? rangeStart === 0
        ? rangeEndLabel
        : rangeSummary
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const shareHeadline = `${searchedFor || 'All logs'} · ${countLabel}`

  async function handleShare() {
    if (sharing || filtered.length === 0) return
    setShareError('')
    setPendingShare(null)
    flushSync(() => setSharing(true))
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    try {
      const result = await shareCardScreenshot(shareCardRef.current, {
        filename: `ruffly-search-${localIsoDate()}.png`,
        title: 'Ruffly search',
        text: `${shareHeadline} — ${formatPackUpdateDate()}`,
        scale: 2,
      })
      if (result?.status === 'needs-gesture') {
        setPendingShare(result)
      }
      track('share_search_results', {
        result: shareResultLabel(result?.status),
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        track('share_search_results', { result: 'Failed' })
        trackException('Share search results failed')
        setShareError(err?.message || 'Couldn’t share the results. Try again.')
      }
    } finally {
      setSharing(false)
    }
  }

  function handlePendingShare() {
    const payload = pendingShare
    if (!payload) return
    // Call share in this tap — Android Chrome rejects share() after any await.
    sharePreparedLog(payload)
      .then((status) => {
        setPendingShare(null)
        track('share_search_results', { result: shareResultLabel(status) })
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          track('share_search_results', { result: 'Failed' })
          trackException('Share search results failed')
          setShareError(
            err?.message || 'Couldn’t share the results. Try again.',
          )
        }
      })
  }

  return (
    <>
      {sharing ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#FBF9F5]/80"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-[#F59E0B]">
            Preparing results…
          </p>
        </div>
      ) : null}

      <Modal
        open={Boolean(pendingShare)}
        title="Share results"
        onClose={() => setPendingShare(null)}
      >
        <p className="text-sm text-slate-500">
          Your results photo is ready. Tap Share to open your phone’s share
          sheet.
        </p>
        <Button className="mt-4 w-full" onClick={handlePendingShare}>
          Share
          <Share size={18} />
        </Button>
      </Modal>

      {sharing ? (
        <SearchShareCard
          cardRef={shareCardRef}
          days={shareDays}
          headline={shareHeadline}
          hiddenCount={Math.max(0, filtered.length - SHARE_LIMIT)}
        />
      ) : null}

      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-0.5">
          <p className="truncate text-sm leading-5 text-slate-500">
            {countLabel}
          </p>
          <h2 className="text-center text-lg font-bold text-slate-800">
            Search
          </h2>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="!h-10 shrink-0 !px-2.5 text-[#F59E0B]"
              onClick={handleShare}
              disabled={sharing || filtered.length === 0}
              aria-label="Share search results"
              aria-busy={sharing}
            >
              Pupdate
              <Share size={18} />
            </Button>
          </div>
        </div>

        {shareError ? (
          <p className="px-0.5 text-sm text-red-600">{shareError}</p>
        ) : null}

        <Card className="space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              className={`${fieldClassName} !mt-0 pl-11`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs, dogs, notes…"
              autoComplete="off"
              aria-label="Search logs"
            />
          </div>

          <div>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 text-left"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="search-filters"
            >
              <span className="shrink-0 text-sm font-semibold text-slate-700">
                Filters
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                {filtersSummary}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-slate-400 transition-transform ${
                  filtersOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>

            {filtersOpen ? (
              <div id="search-filters" className="space-y-3 pt-1">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Type
                  </p>
                  <div
                    role="group"
                    aria-label="Filter logs by type"
                    className="flex flex-wrap gap-2"
                  >
                    <FilterPill
                      active={kinds.length === 0}
                      onClick={() => setKinds([])}
                    >
                      All
                    </FilterPill>
                    {KIND_FILTERS.map((filter) => (
                      <FilterPill
                        key={filter.value}
                        active={kinds.includes(filter.value)}
                        onClick={() => toggleKind(filter.value)}
                      >
                        {filter.label}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                {canFilterByDog ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Dogs
                    </p>
                    <div
                      role="group"
                      aria-label="Filter logs by dog"
                      className="flex flex-wrap gap-2"
                    >
                      <FilterPill
                        active={dogIds.length === 0}
                        onClick={() => setDogIds([])}
                      >
                        All
                      </FilterPill>
                      {dogs.map((dog) => (
                        <DogPill
                          key={dog.id}
                          dog={dog}
                          active={dogIds.includes(dog.id)}
                          onClick={() => toggleDog(dog.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Date range
                    </p>
                    {rangeActive ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#F59E0B]"
                        onClick={() => setRange([0, RANGE_DAYS])}
                      >
                        Any date
                      </button>
                    ) : null}
                  </div>
                  <DateRangeSlider
                    start={rangeStart}
                    end={rangeEnd}
                    onChange={setRange}
                    startLabel={rangeStartLabel}
                    endLabel={rangeEndLabel}
                    max={RANGE_DAYS}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-slate-500">
              {entries.length === 0
                ? 'Nothing logged yet — use + to log food, meds, weigh-ins, and more.'
                : query.trim()
                  ? `No logs match “${query.trim()}”.`
                  : 'No logs match those filters.'}
            </p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {days.map((day) => (
              <li key={day.key}>
                <DayGroup day={day} onEditLog={onEditLog} />
              </li>
            ))}
          </ul>
        )}

        {filtered.length > visible ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
          >
            Show older logs
          </Button>
        ) : null}
      </div>
    </>
  )
}
