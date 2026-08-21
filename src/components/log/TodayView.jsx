import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  GripVertical,
  Minus,
  PawPrint,
  Plus,
  Share,
} from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import BrandMark from '../ui/BrandMark'
import MealCelebration from '../ui/MealCelebration'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import { useHoldReorder } from '../../hooks/useHoldReorder'
import { getCategoryLabel } from '../../utils/calculations'
import { isDogAway } from '../../utils/dogs'
import {
  formatPackUpdateDate,
  sharePreparedLog,
  shareTodayScreenshots,
} from '../../utils/shareToday'
import {
  kindLabel as analyticsKind,
  shareResultLabel,
  track,
  trackException,
} from '../../analytics'
import {
  addLocalDays,
  buildPackTodayTasks,
  estimateFoodKcal,
  formatLogTime,
  formatTodayHeading,
  groupPackTodayBySlot,
  isSameLocalDay,
  isTodayCheckableRow,
  isTodayDailyRow,
  isTodayQuickLogRow,
  isoTimestampOnDay,
  kindLabel,
  startOfLocalDay,
  todayRowKey,
} from '../../utils/todayCare'

const SLOT_CELEBRATIONS = {
  breakfast: 'sun',
  evening: 'moon',
}

function celebrationThemeForSlot(slot) {
  return SLOT_CELEBRATIONS[String(slot ?? '').toLowerCase()] ?? null
}

function packDueCount(groups) {
  return groups.reduce((sum, g) => sum + g.dueCount, 0)
}

function rowCompletedByTask(row, task) {
  if (row.type === 'meal') {
    if (row.done) return false
    if (!row.items.some((item) => item.id === task.id)) return false
    return row.items.every((item) => item.id === task.id || item.done)
  }
  return Boolean(row.task && !row.task.done && row.task.id === task.id)
}

/** Theme to play when logging this item; finishing the day beats meal sun/moon. */
function celebrationWhenCompleting(groups, task) {
  if (task.done) return null
  let mealTheme = null
  let completesDueRow = false
  for (const group of groups) {
    for (const row of group.rows) {
      if (!rowCompletedByTask(row, task)) continue
      completesDueRow = true
      if (row.type === 'meal') {
        mealTheme = celebrationThemeForSlot(row.slot)
      }
    }
  }
  if (!completesDueRow) return null
  if (packDueCount(groups) === 1) return 'allDone'
  return mealTheme
}

function celebrationWhenCompletingMeal(groups, meal) {
  if (meal.done) return null
  if (packDueCount(groups) === 1) return 'allDone'
  return celebrationThemeForSlot(meal.slot)
}

function taskTitle(task) {
  if (task.kind === 'food') {
    return [getCategoryLabel(task.category), task.flavor || task.name]
      .filter(Boolean)
      .join(' · ')
  }
  return task.name
}

function taskAmount(task) {
  if (task.amount == null) return ''
  return `${task.amount}${task.unit ? ` ${task.unit}` : ''}`
}

function taskSubtitle(task) {
  const amount = taskAmount(task)
  const note = task.note?.trim().replace(/\s+/g, ' ')
  if (task.kind === 'note') {
    const parts = [formatLogTime(task.doneAt)]
    if (note && note !== task.name) parts.push(note)
    return parts.filter(Boolean).join(' · ')
  }
  const parts = [kindLabel(task.kind)]
  if (task.kind === 'activity' && note) {
    if (note !== task.name) parts.push(note)
  } else if (task.slotLabel) {
    parts.push(task.slotLabel)
  }
  if (amount) parts.push(amount)
  return parts.join(' · ')
}

function NoteMark({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg leading-none ring-1 ring-amber-200"
      aria-label={label}
    >
      <span aria-hidden>📝</span>
    </button>
  )
}

function CheckButton({ done, partial, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
        done
          ? 'bg-[#10B981] text-white'
          : partial
            ? 'bg-amber-100 text-[#F59E0B] ring-1 ring-amber-200'
            : 'bg-white text-slate-400 ring-1 ring-amber-200 hover:text-[#F59E0B]'
      }`}
      aria-label={label}
    >
      {done ? (
        <Check size={20} strokeWidth={2.5} />
      ) : partial ? (
        <Minus size={20} strokeWidth={2.5} />
      ) : (
        <Circle size={20} />
      )}
    </button>
  )
}

function KcalBar({ logged, target }) {
  if (!target || target <= 0) return null
  const pct = Math.min(100, Math.round((logged / target) * 100))
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 text-xs leading-5">
        <span className="whitespace-nowrap font-medium text-slate-500">
          {Math.round(logged)} / {Math.round(target)} kcal
        </span>
        <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-400">
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-amber-100">
        <div
          className="h-full rounded-full bg-[#F59E0B] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ReorderGrip({ name, dragging, handleProps }) {
  return (
    <button
      type="button"
      className={`share-hide flex h-11 w-8 shrink-0 items-center justify-center select-none [-webkit-touch-callout:none] hover:text-slate-400 ${
        dragging
          ? 'cursor-grabbing touch-none text-slate-400'
          : 'cursor-grab touch-manipulation text-slate-300'
      }`}
      aria-label={`Hold and drag to reorder ${name}`}
      aria-grabbed={dragging}
      {...handleProps}
    >
      <GripVertical size={18} strokeWidth={2.5} aria-hidden />
    </button>
  )
}

function TaskRow({
  task,
  dogName,
  onDone,
  onUndo,
  onEdit,
  rowRef,
  dragging = false,
  reorderHandle = null,
}) {
  const isNote = task.kind === 'note'
  const who = dogName ? `${dogName}’s ` : ''
  return (
    <li
      ref={rowRef}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        dragging
          ? 'relative z-10 scale-[1.02] border-[#F59E0B]/40 bg-white shadow-lg'
          : task.done && !isNote
            ? 'border-emerald-100 bg-emerald-50/60'
            : 'border-amber-100 bg-[#FBF9F5]'
      }`}
    >
      {isNote ? (
        <NoteMark
          label={`Edit note ${who}${task.name}`}
          onClick={() => onEdit?.(task)}
        />
      ) : (
        <CheckButton
          done={task.done}
          label={
            task.done
              ? `Undo ${who}${task.name}`
              : `Mark ${who}${task.name} done`
          }
          onClick={() => (task.done ? onUndo?.(task) : onDone?.(task))}
        />
      )}
      {isNote ? (
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onEdit?.(task)}
        >
          <p className="truncate text-sm font-semibold text-slate-800">
            {taskTitle(task)}
          </p>
          <p className="line-clamp-2 text-xs text-slate-400">
            {taskSubtitle(task)}
          </p>
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold ${
              task.done ? 'text-slate-500 line-through' : 'text-slate-800'
            }`}
          >
            {taskTitle(task)}
          </p>
          <p className="truncate text-xs text-slate-400">
            {taskSubtitle(task)}
          </p>
        </div>
      )}
      {reorderHandle}
    </li>
  )
}

function MealRow({
  meal,
  title,
  checkName,
  strikeTitle = true,
  dogName,
  onDone,
  onUndo,
  onItemDone,
  onItemUndo,
  rowRef,
}) {
  const heading = title ?? meal.slotLabel
  const ariaName = checkName ?? meal.slotLabel
  const itemWho = dogName ? `${dogName}’s ` : ''
  return (
    <li
      ref={rowRef}
      className={`rounded-2xl border px-3 py-2.5 transition-colors ${
        meal.done
          ? 'border-emerald-100 bg-emerald-50/60'
          : 'border-amber-100 bg-[#FBF9F5]'
      }`}
    >
      <div className="flex items-center gap-3">
        <CheckButton
          done={meal.done}
          partial={meal.partial}
          label={
            meal.done ? `Undo ${ariaName}` : `Mark ${ariaName} done`
          }
          onClick={() => (meal.done ? onUndo?.(meal) : onDone?.(meal))}
        />
        <div className="min-w-0 flex-1">
          {typeof heading === 'string' ? (
            <p
              className={`truncate text-sm font-semibold ${
                meal.done && strikeTitle
                  ? 'text-slate-500 line-through'
                  : 'text-slate-800'
              }`}
            >
              {heading}
            </p>
          ) : (
            heading
          )}
          {meal.partial ? (
            <p className="text-xs text-slate-400">
              {meal.items.filter((item) => item.done).length} of{' '}
              {meal.items.length} logged
            </p>
          ) : null}
        </div>
      </div>
      <ul className="mt-1">
        {meal.items.map((item) => {
          const amount = taskAmount(item)
          const title = taskTitle(item)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() =>
                  item.done ? onItemUndo?.(item) : onItemDone?.(item)
                }
                className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left hover:bg-white/80"
                aria-label={
                  item.done
                    ? `Undo ${itemWho}${title}`
                    : `Log ${itemWho}${title}`
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <span
                    className={item.done ? 'text-[#10B981]' : 'text-slate-300'}
                  >
                    {item.done ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : (
                      <Circle size={16} />
                    )}
                  </span>
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    item.done ? 'text-slate-400 line-through' : 'text-slate-600'
                  }`}
                >
                  {title}
                  {item.kind !== 'food' ? (
                    <span className="text-xs text-slate-400">
                      {' '}
                      · {kindLabel(item.kind)}
                    </span>
                  ) : null}
                </span>
                {amount ? (
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-xs text-slate-400">
                    {amount}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

function TodayTaskRow({
  row,
  title,
  checkName,
  strikeTitle,
  dogName,
  onMealDone,
  onMealUndo,
  onItemDone,
  onItemUndo,
  onItemEdit,
  rowRef,
  dragging,
  reorderHandle,
}) {
  if (row.type === 'meal') {
    return (
      <MealRow
        meal={row}
        title={title}
        checkName={checkName}
        strikeTitle={strikeTitle}
        dogName={dogName}
        onDone={onMealDone}
        onUndo={onMealUndo}
        onItemDone={onItemDone}
        onItemUndo={onItemUndo}
        rowRef={rowRef}
      />
    )
  }
  return (
    <TaskRow
      task={row.task}
      dogName={dogName}
      onDone={onItemDone}
      onUndo={onItemUndo}
      onEdit={onItemEdit}
      rowRef={rowRef}
      dragging={dragging}
      reorderHandle={reorderHandle}
    />
  )
}

function DogNameButton({ dog, onEditMenu, className = '' }) {
  return (
    <button
      type="button"
      className={`flex min-w-0 items-center gap-2 text-left ${className}`}
      onClick={() => onEditMenu?.(dog.id)}
      aria-label={`Edit ${dog.name}’s routine`}
    >
      <DogAvatar name={dog.name} photoUrl={dog.photoUrl} size="sm" />
      <span className="truncate font-bold text-slate-800">{dog.name}</span>
    </button>
  )
}

function GroupByToggle({ value, onChange }) {
  return (
    <div
      className="share-hide flex rounded-2xl bg-amber-100/70 p-1"
      role="radiogroup"
      aria-label="Today grouping"
    >
      {[
        { id: 'dog', label: 'By dog' },
        { id: 'meal', label: 'By meal' },
      ].map((option) => {
        const selected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`h-10 flex-1 rounded-xl text-sm font-semibold transition-colors ${
              selected
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function SlotSection({
  section,
  viewingToday,
  onEditMenu,
  onMealDone,
  onMealUndo,
  onItemDone,
  onItemUndo,
  onItemEdit,
}) {
  const subtitle =
    section.checkableCount > 0 && section.dueCount === 0
      ? viewingToday
        ? 'All done for today'
        : 'All done'
      : section.dueCount > 0
        ? `${section.dueCount} left`
        : null

  const headingId = `today-slot-${String(section.id ?? section.slot).replace(/[^a-z0-9-]+/gi, '-')}`
  return (
    <Card className="!p-4" aria-labelledby={headingId}>
      <div className="mb-3">
        <h3 id={headingId} className="font-bold text-slate-800">
          {section.slotLabel}
        </h3>
        {subtitle ? (
          <p className="text-xs text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <ul className="space-y-3">
        {section.dogs.map(({ dog, rows }) => {
          const mealOnly = rows.length === 1 && rows[0].type === 'meal'
          return (
            <li key={dog.id} className="space-y-2">
              {mealOnly ? null : (
                <DogNameButton dog={dog} onEditMenu={onEditMenu} />
              )}
              <ul className="space-y-2">
                {rows.map((row) => (
                  <TodayTaskRow
                    key={row.id}
                    row={row}
                    title={
                      mealOnly ? (
                        <DogNameButton
                          dog={dog}
                          onEditMenu={onEditMenu}
                          className="w-full"
                        />
                      ) : undefined
                    }
                    checkName={
                      row.type === 'meal'
                        ? `${dog.name}’s ${row.slotLabel}`
                        : undefined
                    }
                    strikeTitle={false}
                    dogName={dog.name}
                    onMealDone={onMealDone}
                    onMealUndo={onMealUndo}
                    onItemDone={onItemDone}
                    onItemUndo={onItemUndo}
                    onItemEdit={onItemEdit}
                  />
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function DogTodayTaskList({
  dog,
  rows,
  canReorderRows = true,
  onMealDone,
  onMealUndo,
  onItemDone,
  onItemUndo,
  onItemEdit,
}) {
  const { dispatch } = useApp()
  const movable = rows.filter((row) => todayRowKey(row) != null)
  const pinned = rows.filter((row) => todayRowKey(row) == null)
  const ids = movable.map((row) => row.id)
  const canReorder =
    canReorderRows &&
    movable.some((row) => isTodayDailyRow(row) || isTodayQuickLogRow(row)) &&
    movable.length > 1
  const { currentIds, draggingId, setItemRef, bindHandle } = useHoldReorder({
    ids,
    enabled: canReorder,
    onCommit: (orderedIds) => {
      const byId = new Map(movable.map((row) => [row.id, row]))
      const order = orderedIds
        .map((id) => todayRowKey(byId.get(id)))
        .filter(Boolean)
      dispatch({
        type: 'UPDATE_DOG_PROFILE',
        payload: { id: dog.id, todayRowOrder: order },
      })
    },
  })
  const byId = new Map(movable.map((row) => [row.id, row]))
  const ordered = currentIds.map((id) => byId.get(id)).filter(Boolean)

  return (
    <ul className={`space-y-2 ${draggingId ? 'select-none' : ''}`}>
      {ordered.map((row) => (
        <TodayTaskRow
          key={row.id}
          row={row}
          onMealDone={onMealDone}
          onMealUndo={onMealUndo}
          onItemDone={onItemDone}
          onItemUndo={onItemUndo}
          onItemEdit={onItemEdit}
          rowRef={(node) => setItemRef(row.id, node)}
          dragging={row.id === draggingId}
          reorderHandle={
            canReorder &&
            (isTodayDailyRow(row) || isTodayQuickLogRow(row)) ? (
              <ReorderGrip
                name={row.task.name}
                dragging={row.id === draggingId}
                handleProps={bindHandle(row.id)}
              />
            ) : null
          }
        />
      ))}
      {pinned.map((row) => (
        <TodayTaskRow
          key={row.id}
          row={row}
          onMealDone={onMealDone}
          onMealUndo={onMealUndo}
          onItemDone={onItemDone}
          onItemUndo={onItemUndo}
          onItemEdit={onItemEdit}
        />
      ))}
    </ul>
  )
}

function DayHeading({
  day,
  onPrev,
  onNext,
  canGoForward,
  subtitle,
  subtitleLabel,
  shareButton = null,
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-0.5">
      <p
        className="truncate text-sm leading-5 tabular-nums text-slate-500"
        aria-label={subtitleLabel}
      >
        {subtitle}
      </p>
      <div className="flex items-center">
        <button
          type="button"
          className="share-hide flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-amber-50 hover:text-[#F59E0B]"
          onClick={onPrev}
          aria-label="Previous day"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h2
          className="min-w-[5.5rem] text-center text-lg font-bold tabular-nums text-slate-800"
          aria-live="polite"
        >
          {formatTodayHeading(day)}
        </h2>
        <button
          type="button"
          className={`share-hide flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            canGoForward
              ? 'text-slate-400 hover:bg-amber-50 hover:text-[#F59E0B]'
              : 'cursor-default text-slate-200'
          }`}
          onClick={onNext}
          disabled={!canGoForward}
          aria-label="Next day"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex justify-end">{shareButton}</div>
    </div>
  )
}

/** Post-onboarding home — care due today across the pack. */
export default function TodayView({
  onLog,
  onAddDog,
  onOpenPack,
  onEditMenu,
  onEditLog,
}) {
  const { dogs, catalog, menusByDogId, logs, todayGroupBy, dispatch } =
    useApp()
  const dogCardRefs = useRef(new Map())
  const [viewingDay, setViewingDay] = useState(() => startOfLocalDay())
  const [celebration, setCelebration] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [pendingShare, setPendingShare] = useState(null)
  const viewingToday = isSameLocalDay(viewingDay)
  const groups = buildPackTodayTasks(
    dogs,
    menusByDogId,
    catalog,
    logs,
    viewingDay,
  )
  const homeDogs = dogs.filter((dog) => !isDogAway(dog))
  const canGroupByMeal = homeDogs.length >= 2
  const showByMeal =
    canGroupByMeal && todayGroupBy === 'meal' && !sharing
  const slotSections = showByMeal ? groupPackTodayBySlot(groups) : []
  const dogsNeedingMenu = showByMeal
    ? groups.filter((group) => !group.hasMenu && group.rows.length === 0)
    : []
  const totalDue = groups.reduce((sum, g) => sum + g.dueCount, 0)
  const totalDone = groups.reduce((sum, g) => sum + g.doneCount, 0)
  const totalCareRows = groups.reduce(
    (sum, g) => sum + g.rows.filter(isTodayCheckableRow).length,
    0,
  )
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0)

  function shiftDay(delta) {
    const next = addLocalDays(viewingDay, delta)
    if (next.getTime() > startOfLocalDay().getTime()) return
    setViewingDay(next)
  }

  const headingSubtitle =
    totalTasks === 0
      ? viewingToday
        ? 'Nothing on the menu yet'
        : 'No logs this day'
      : totalDue === 0
        ? '😊'
        : `${totalDone} of ${totalCareRows}`
  const headingSubtitleLabel =
    totalTasks > 0 && totalDue === 0
      ? viewingToday
        ? 'You’re all caught up'
        : 'All caught up that day'
      : totalCareRows > 0
        ? `${totalDone} of ${totalCareRows} care items done`
        : undefined
  const playCelebration = useCallback((theme) => {
    if (!theme) return
    setCelebration({ theme, playId: Date.now() })
  }, [])
  const dismissCelebration = useCallback(() => setCelebration(null), [])

  function setDogCardRef(id, node) {
    if (node) dogCardRefs.current.set(id, node)
    else dogCardRefs.current.delete(id)
  }

  function handleGroupBy(next) {
    if (next === todayGroupBy) return
    dispatch({ type: 'SET_TODAY_GROUP_BY', payload: next })
    track('switch_today_group', {
      method: next === 'meal' ? 'By meal' : 'By dog',
    })
  }

  async function handleShareLog() {
    if (sharing) return
    setShareError('')
    setPendingShare(null)
    flushSync(() => setSharing(true))
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    try {
      const items = groups
        .map(({ dog }) => ({
          node: dogCardRefs.current.get(dog.id),
          name: dog.name,
        }))
        .filter((item) => item.node)
      const result = await shareTodayScreenshots(items, {
        totalDue,
        day: viewingDay,
      })
      if (result?.status === 'needs-gesture') {
        setPendingShare(result)
        track('share_today_log', { result: shareResultLabel('needs-gesture') })
      } else {
        track('share_today_log', {
          result: shareResultLabel(result?.status),
        })
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        track('share_today_log', { result: 'Failed' })
        trackException('Share today log failed')
        setShareError(
          err?.message || 'Couldn’t share the log. Try again.',
        )
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
        track('share_today_log', { result: shareResultLabel(status) })
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          track('share_today_log', { result: 'Failed' })
          trackException('Share today log failed')
          setShareError(
            err?.message || 'Couldn’t share the log. Try again.',
          )
        }
      })
  }

  function logTask(task) {
    if (task.kind === 'note') return
    const careItem = (catalog ?? []).find((c) => c.id === task.careItemId)
    const amount = task.amount
    const kcal =
      task.kind === 'food' ? estimateFoodKcal(careItem, amount) : null
    dispatch({
      type: 'ADD_LOG',
      payload: {
        dogId: task.dogId,
        careItemId: task.careItemId,
        kind: task.kind,
        amount,
        unit: task.unit,
        kcal,
        menuItemId: task.menuItemId,
        note: '',
        loggedAt: isoTimestampOnDay(viewingDay),
      },
    })
  }

  function handleDone(task) {
    const theme = viewingToday
      ? celebrationWhenCompleting(groups, task)
      : null
    logTask(task)
    playCelebration(theme)
    track('check_off_routine', {
      item_kind: analyticsKind(task.kind),
      method: 'Today check-off',
    })
  }

  function handleUndo(task) {
    if (task.kind === 'note') return
    if (task.doneLogId) {
      dispatch({ type: 'DELETE_LOG', payload: task.doneLogId })
      track('undo_routine', {
        item_kind: analyticsKind(task.kind),
        method: 'Today check-off',
      })
    }
  }

  function handleEditNote(task) {
    if (task?.kind !== 'note' || !task.doneLogId) return
    const log = (logs ?? []).find((entry) => entry.id === task.doneLogId)
    if (log) onEditLog?.(log)
  }

  function handleMealDone(meal) {
    const theme = viewingToday
      ? celebrationWhenCompletingMeal(groups, meal)
      : null
    for (const item of meal.items) {
      if (!item.done) logTask(item)
    }
    playCelebration(theme)
    track('complete_meal', {
      item_count: meal.items.filter((item) => !item.done).length,
      method: 'Today check-off',
    })
  }

  function handleMealUndo(meal) {
    for (const item of meal.items) {
      if (item.doneLogId) {
        dispatch({ type: 'DELETE_LOG', payload: item.doneLogId })
      }
    }
    track('undo_routine', {
      item_kind: 'Meal',
      method: 'Today check-off',
    })
  }

  if (dogs.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-[#F59E0B]">
          <PawPrint size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Meet your first pup</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a dog to get a daily kcal target, then set their menu — Today
            will show what to log.
          </p>
        </div>
        <Button className="w-full" onClick={onAddDog}>
          Add a dog
        </Button>
      </Card>
    )
  }

  if (homeDogs.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <PawPrint size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Everyone’s away</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paused dogs skip Today. Mark a pup as home from Pack when they’re
            back with you.
          </p>
        </div>
        <Button className="w-full" onClick={onOpenPack}>
          Manage pack
        </Button>
      </Card>
    )
  }

  if (totalTasks === 0) {
    return (
      <div className="space-y-4">
        <DayHeading
          day={viewingDay}
          onPrev={() => shiftDay(-1)}
          onNext={() => shiftDay(1)}
          canGoForward={!viewingToday}
          subtitle={headingSubtitle}
          subtitleLabel={headingSubtitleLabel}
        />
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-bold text-slate-800">
            {viewingToday ? 'Nothing on the menu yet' : 'No logs this day'}
          </h2>
          <p className="text-sm text-slate-500">
            {viewingToday
              ? 'Build a daily routine for food, meds, and supplements — then check them off here like watering your plants.'
              : 'There’s nothing recorded for this date. Check a day with logs, or set up a menu to see the routine here.'}
          </p>
          {viewingToday ? (
            <>
              <Button className="w-full" onClick={() => onEditMenu?.()}>
                Set up a menu
              </Button>
              <Button variant="secondary" className="w-full" onClick={onLog}>
                <Plus size={18} />
                Log something anyway
              </Button>
            </>
          ) : null}
        </Card>
      </div>
    )
  }

  return (
    <>
      {sharing ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#FBF9F5]/80 print:hidden"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-[#F59E0B]">
            Preparing log…
          </p>
        </div>
      ) : null}

      <Modal
        open={Boolean(pendingShare)}
        title="Share log"
        onClose={() => setPendingShare(null)}
      >
        <p className="text-sm text-slate-500">
          Your log photo is ready. Tap Share to open your phone’s share sheet.
        </p>
        <Button className="mt-4 w-full" onClick={handlePendingShare}>
          Share
          <Share size={18} />
        </Button>
      </Modal>

      <div
        data-sharing={sharing ? 'true' : undefined}
        className="space-y-4"
      >
        <DayHeading
          day={viewingDay}
          onPrev={() => shiftDay(-1)}
          onNext={() => shiftDay(1)}
          canGoForward={!viewingToday}
          subtitle={headingSubtitle}
          subtitleLabel={headingSubtitleLabel}
          shareButton={
            <Button
              variant="ghost"
              className="share-hide !h-10 !w-10 shrink-0 !px-0 text-[#F59E0B]"
              onClick={handleShareLog}
              disabled={sharing}
              aria-label="Share log"
              aria-busy={sharing}
            >
              <Share size={18} />
            </Button>
          }
        />

      {canGroupByMeal ? (
        <GroupByToggle
          value={todayGroupBy === 'meal' ? 'meal' : 'dog'}
          onChange={handleGroupBy}
        />
      ) : null}

      {shareError ? (
        <p className="share-hide px-0.5 text-sm text-red-600">{shareError}</p>
      ) : null}

      {totalCareRows > 0 && totalDue === 0 ? (
        <Card className="border border-emerald-100 bg-emerald-50/50 text-center">
          <p className="text-base font-bold text-emerald-800">
            Pack’s looking good
          </p>
          <p className="mt-1 text-sm text-emerald-700/80">
            {viewingToday
              ? 'Everything on today’s menus is logged. Tap Log if something extra happened.'
              : 'Everything on this day’s menus was logged.'}
          </p>
        </Card>
      ) : null}

      {showByMeal ? (
        <ul className="space-y-4">
          {slotSections.map((section) => (
            <li key={section.id ?? section.slot}>
              <SlotSection
                section={section}
                viewingToday={viewingToday}
                onEditMenu={onEditMenu}
                onMealDone={handleMealDone}
                onMealUndo={handleMealUndo}
                onItemDone={handleDone}
                onItemUndo={handleUndo}
                onItemEdit={handleEditNote}
              />
            </li>
          ))}
        </ul>
      ) : (
      <ul className="space-y-4">
        {groups.map(({ dog, rows, dueCount, kcalLogged, targetDER, hasMenu }) => (
          <li
            key={dog.id}
            ref={(node) => setDogCardRef(dog.id, node)}
            className={
              sharing ? 'space-y-4 overflow-visible bg-[#FBF9F5] px-5 py-6' : undefined
            }
          >
            {sharing ? (
              <div className="flex items-center gap-3">
                <BrandMark className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-sm font-extrabold leading-5 text-[#F59E0B]">
                    Ruffly
                  </p>
                  <p className="whitespace-nowrap text-xs leading-5 text-slate-500">
                    {dog.name} · {formatPackUpdateDate(viewingDay)}
                  </p>
                </div>
              </div>
            ) : null}
            <Card className={sharing ? '!p-5 !shadow-none' : '!p-4'}>
              <div className="mb-3 flex items-center gap-3">
                <DogAvatar
                  name={dog.name}
                  photoUrl={dog.photoUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-bold text-slate-800">
                      {dog.name}
                    </h3>
                    <button
                      type="button"
                      className="share-hide shrink-0 text-xs font-semibold text-[#F59E0B]"
                      onClick={() => onEditMenu?.(dog.id)}
                    >
                      {hasMenu ? 'Edit routine' : 'Add routine'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {rows.some(isTodayCheckableRow) && dueCount === 0
                      ? viewingToday
                        ? 'All done for today'
                        : 'All done'
                      : dueCount > 0
                        ? `${dueCount} left`
                        : 'No menu yet'}
                  </p>
                  <KcalBar logged={kcalLogged} target={targetDER} />
                </div>
              </div>

              {rows.length > 0 ? (
                <DogTodayTaskList
                  dog={dog}
                  rows={rows}
                  canReorderRows={viewingToday}
                  onMealDone={handleMealDone}
                  onMealUndo={handleMealUndo}
                  onItemDone={handleDone}
                  onItemUndo={handleUndo}
                  onItemEdit={handleEditNote}
                />
              ) : !hasMenu ? (
                <p className="rounded-2xl bg-[#FBF9F5] px-3 py-3 text-sm text-slate-500">
                  Set a daily menu so care shows up here.{' '}
                  <button
                    type="button"
                    className="share-hide font-semibold text-[#F59E0B]"
                    onClick={() => onEditMenu?.(dog.id)}
                  >
                    Set up
                  </button>
                </p>
              ) : null}
            </Card>
            {sharing ? (
              <p className="pt-1 text-center text-xs leading-5 text-slate-400">
                Shared from Ruffly.app
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      )}

      {dogsNeedingMenu.length > 0 ? (
        <ul className="space-y-4">
          {dogsNeedingMenu.map(({ dog }) => (
            <li key={dog.id}>
              <Card className="!p-4">
                <div className="flex items-center gap-3">
                  <DogAvatar
                    name={dog.name}
                    photoUrl={dog.photoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-800">
                      {dog.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Set a daily menu so care shows up here.{' '}
                      <button
                        type="button"
                        className="font-semibold text-[#F59E0B]"
                        onClick={() => onEditMenu?.(dog.id)}
                      >
                        Set up
                      </button>
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={onOpenPack}
        className="share-hide w-full py-2 text-center text-sm font-semibold text-slate-400 hover:text-slate-600"
      >
        Manage pack →
      </button>
      </div>

      <MealCelebration
        playId={celebration?.playId ?? null}
        theme={celebration?.theme ?? 'sun'}
        onDone={dismissCelebration}
      />
    </>
  )
}
