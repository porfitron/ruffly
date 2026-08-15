import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Check,
  Circle,
  GripVertical,
  Minus,
  PawPrint,
  Plus,
  Share,
} from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import BrandMark from '../ui/BrandMark'
import MealCelebration from '../ui/MealCelebration'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import { useHoldReorder } from '../../hooks/useHoldReorder'
import { isDogAway } from '../../utils/dogs'
import {
  formatPackUpdateDate,
  shareTodayScreenshots,
} from '../../utils/shareToday'
import {
  buildPackTodayTasks,
  estimateFoodKcal,
  isTodayDailyRow,
  kindLabel,
  todayRowKey,
} from '../../utils/todayCare'

const SLOT_CELEBRATIONS = {
  breakfast: 'sun',
  evening: 'moon',
}

function celebrationThemeForSlot(slot) {
  return SLOT_CELEBRATIONS[String(slot ?? '').toLowerCase()] ?? null
}

/** Theme to play when logging this item finishes its meal. */
function celebrationWhenCompleting(groups, task) {
  const theme = celebrationThemeForSlot(task.slot)
  if (!theme || task.done) return null
  for (const group of groups) {
    for (const row of group.rows) {
      if (row.type !== 'meal' || celebrationThemeForSlot(row.slot) !== theme) {
        continue
      }
      if (!row.items.some((item) => item.id === task.id)) continue
      const completes = row.items.every(
        (item) => item.id === task.id || item.done,
      )
      return completes ? theme : null
    }
  }
  return null
}

function taskTitle(task) {
  if (task.kind === 'food' && (task.brand || task.flavor)) {
    return [task.brand, task.name, task.flavor].filter(Boolean).join(' · ')
  }
  return task.name
}

function taskAmount(task) {
  if (task.amount == null) return ''
  return `${task.amount}${task.unit ? ` ${task.unit}` : ''}`
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
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-500">
          {Math.round(logged)} / {Math.round(target)} kcal today
        </span>
        <span className="tabular-nums text-slate-400">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-amber-100">
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
  onDone,
  onUndo,
  rowRef,
  dragging = false,
  reorderHandle = null,
}) {
  const amount = taskAmount(task)
  return (
    <li
      ref={rowRef}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        dragging
          ? 'relative z-10 scale-[1.02] border-[#F59E0B]/40 bg-white shadow-lg'
          : task.done
            ? 'border-emerald-100 bg-emerald-50/60'
            : 'border-amber-100 bg-[#FBF9F5]'
      }`}
    >
      <CheckButton
        done={task.done}
        label={task.done ? `Undo ${task.name}` : `Mark ${task.name} done`}
        onClick={() => (task.done ? onUndo?.(task) : onDone?.(task))}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            task.done ? 'text-slate-500 line-through' : 'text-slate-800'
          }`}
        >
          {taskTitle(task)}
        </p>
        <p className="truncate text-xs text-slate-400">
          {kindLabel(task.kind)}
          {task.oneTime
            ? ' · Today only'
            : task.slotLabel
              ? ` · ${task.slotLabel}`
              : ''}
          {amount ? ` · ${amount}` : ''}
        </p>
      </div>
      {reorderHandle}
    </li>
  )
}

function MealRow({ meal, onDone, onUndo, onItemDone, onItemUndo, rowRef }) {
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
            meal.done
              ? `Undo ${meal.slotLabel}`
              : `Mark ${meal.slotLabel} done`
          }
          onClick={() => (meal.done ? onUndo?.(meal) : onDone?.(meal))}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold ${
              meal.done ? 'text-slate-500 line-through' : 'text-slate-800'
            }`}
          >
            {meal.slotLabel}
          </p>
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
                aria-label={item.done ? `Undo ${title}` : `Log ${title}`}
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
  onMealDone,
  onMealUndo,
  onItemDone,
  onItemUndo,
  rowRef,
  dragging,
  reorderHandle,
}) {
  if (row.type === 'meal') {
    return (
      <MealRow
        meal={row}
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
      onDone={onItemDone}
      onUndo={onItemUndo}
      rowRef={rowRef}
      dragging={dragging}
      reorderHandle={reorderHandle}
    />
  )
}

function DogTodayTaskList({
  dog,
  rows,
  onMealDone,
  onMealUndo,
  onItemDone,
  onItemUndo,
}) {
  const { dispatch } = useApp()
  const movable = rows.filter((row) => todayRowKey(row) != null)
  const pinned = rows.filter((row) => todayRowKey(row) == null)
  const ids = movable.map((row) => row.id)
  const canReorder =
    movable.some(isTodayDailyRow) && movable.length > 1
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
          rowRef={(node) => setItemRef(row.id, node)}
          dragging={row.id === draggingId}
          reorderHandle={
            canReorder && isTodayDailyRow(row) ? (
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
        />
      ))}
    </ul>
  )
}

/** Post-onboarding home — care due today across the pack. */
export default function TodayView({
  onLog,
  onAddDog,
  onOpenPack,
  onEditMenu,
}) {
  const { dogs, catalog, menusByDogId, logs, dispatch } = useApp()
  const dogCardRefs = useRef(new Map())
  const [celebration, setCelebration] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const groups = buildPackTodayTasks(dogs, menusByDogId, catalog, logs)
  const homeDogs = dogs.filter((dog) => !isDogAway(dog))
  const totalDue = groups.reduce((sum, g) => sum + g.dueCount, 0)
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0)
  const playCelebration = useCallback((theme) => {
    if (!theme) return
    setCelebration({ theme, playId: Date.now() })
  }, [])
  const dismissCelebration = useCallback(() => setCelebration(null), [])

  function setDogCardRef(id, node) {
    if (node) dogCardRefs.current.set(id, node)
    else dogCardRefs.current.delete(id)
  }

  async function handleShareUpdates() {
    if (sharing) return
    setShareError('')
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
      await shareTodayScreenshots(items, { totalDue })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setShareError(
          err?.message || 'Couldn’t share the update. Try again.',
        )
      }
    } finally {
      setSharing(false)
    }
  }

  function logTask(task) {
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
      },
    })
  }

  function handleDone(task) {
    const theme = celebrationWhenCompleting(groups, task)
    logTask(task)
    playCelebration(theme)
  }

  function handleUndo(task) {
    if (task.doneLogId) {
      dispatch({ type: 'DELETE_LOG', payload: task.doneLogId })
    }
  }

  function handleMealDone(meal) {
    const theme = meal.done ? null : celebrationThemeForSlot(meal.slot)
    for (const item of meal.items) {
      if (!item.done) logTask(item)
    }
    playCelebration(theme)
  }

  function handleMealUndo(meal) {
    for (const item of meal.items) {
      if (item.doneLogId) {
        dispatch({ type: 'DELETE_LOG', payload: item.doneLogId })
      }
    }
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
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-bold text-slate-800">Nothing on the menu yet</h2>
          <p className="text-sm text-slate-500">
            Build a daily routine for food, meds, and supplements — then check
            them off here like watering your plants.
          </p>
          <Button className="w-full" onClick={() => onEditMenu?.()}>
            Set up a menu
          </Button>
          <Button variant="secondary" className="w-full" onClick={onLog}>
            <Plus size={18} />
            Log something anyway
          </Button>
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
            Preparing update…
          </p>
        </div>
      ) : null}

      <div
        data-sharing={sharing ? 'true' : undefined}
        className="space-y-4"
      >
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800">Today</h2>
            <p className="text-sm leading-5 text-slate-500">
              {totalDue === 0
                ? 'You’re all caught up'
                : `${totalDue} care item${totalDue === 1 ? '' : 's'} left`}
            </p>
          </div>
          <Button
            variant="ghost"
            className="share-hide !h-10 shrink-0 whitespace-nowrap px-3 text-[#F59E0B]"
            onClick={handleShareUpdates}
            disabled={sharing}
            aria-busy={sharing}
          >
            Share Updates
            <Share size={18} />
          </Button>
        </div>

      {shareError ? (
        <p className="share-hide px-0.5 text-sm text-red-600">{shareError}</p>
      ) : null}

      {totalDue === 0 ? (
        <Card className="border border-emerald-100 bg-emerald-50/50 text-center">
          <p className="text-base font-bold text-emerald-800">
            Pack’s looking good
          </p>
          <p className="mt-1 text-sm text-emerald-700/80">
            Everything on today’s menus is logged. Tap Log if something extra
            happened.
          </p>
        </Card>
      ) : null}

      <ul className="space-y-4">
        {groups.map(({ dog, rows, dueCount, kcalLogged, targetDER, hasMenu }) => (
          <li
            key={dog.id}
            ref={(node) => setDogCardRef(dog.id, node)}
            className={sharing ? 'space-y-4 bg-[#FBF9F5] px-5 py-6' : undefined}
          >
            {sharing ? (
              <div className="flex items-center gap-3">
                <BrandMark className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-sm font-extrabold leading-5 text-[#F59E0B]">
                    Ruffly
                  </p>
                  <p className="whitespace-nowrap text-xs leading-5 text-slate-500">
                    {dog.name} · {formatPackUpdateDate()}
                  </p>
                </div>
              </div>
            ) : null}
            <Card className="!p-4">
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
                      {hasMenu ? 'Edit routine' : 'Add menu'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {rows.length > 0 && dueCount === 0
                      ? 'All done for today'
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
                  onMealDone={handleMealDone}
                  onMealUndo={handleMealUndo}
                  onItemDone={handleDone}
                  onItemUndo={handleUndo}
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
