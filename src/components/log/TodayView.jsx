import { Check, Circle, PawPrint, Plus } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import {
  buildPackTodayTasks,
  estimateFoodKcal,
  kindLabel,
} from '../../utils/todayCare'


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

function TaskRow({ task, onDone, onUndo }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        task.done
          ? 'border-emerald-100 bg-emerald-50/60'
          : 'border-amber-100 bg-[#FBF9F5]'
      }`}
    >
      <button
        type="button"
        onClick={() => (task.done ? onUndo?.(task) : onDone?.(task))}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
          task.done
            ? 'bg-[#10B981] text-white'
            : 'bg-white text-slate-400 ring-1 ring-amber-200 hover:text-[#F59E0B]'
        }`}
        aria-label={
          task.done
            ? `Undo ${task.name}`
            : `Mark ${task.name} done`
        }
      >
        {task.done ? <Check size={20} strokeWidth={2.5} /> : <Circle size={20} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            task.done ? 'text-slate-500 line-through' : 'text-slate-800'
          }`}
        >
          {task.kind === 'food' && (task.brand || task.flavor)
            ? [task.brand, task.name, task.flavor].filter(Boolean).join(' · ')
            : task.name}
        </p>
        <p className="truncate text-xs text-slate-400">
          {kindLabel(task.kind)}
          {task.slotLabel ? ` · ${task.slotLabel}` : ''}
          {task.amount != null
            ? ` · ${task.amount}${task.unit ? ` ${task.unit}` : ''}`
            : ''}
        </p>
      </div>
    </li>
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
  const groups = buildPackTodayTasks(dogs, menusByDogId, catalog, logs)
  const totalDue = groups.reduce((sum, g) => sum + g.dueCount, 0)
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0)

  function handleDone(task) {
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

  function handleUndo(task) {
    const match = (logs ?? [])
      .filter(
        (log) =>
          log.dogId === task.dogId &&
          (log.menuItemId === task.menuItemId ||
            log.careItemId === task.careItemId),
      )
      .sort((a, b) => String(b.loggedAt).localeCompare(String(a.loggedAt)))[0]
    if (match) {
      dispatch({ type: 'DELETE_LOG', payload: match.id })
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
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Today</h2>
          <p className="text-sm text-slate-500">
            {totalDue === 0
              ? 'You’re all caught up'
              : `${totalDue} care item${totalDue === 1 ? '' : 's'} left`}
          </p>
        </div>
        <Button
          variant="ghost"
          className="!h-10 shrink-0 px-3 text-[#F59E0B]"
          onClick={onLog}
        >
          <Plus size={18} />
          Log
        </Button>
      </div>

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
        {groups.map(({ dog, tasks, dueCount, kcalLogged, targetDER, hasMenu }) => (
          <li key={dog.id}>
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
                      className="shrink-0 text-xs font-semibold text-[#F59E0B]"
                      onClick={() => onEditMenu?.(dog.id)}
                    >
                      {hasMenu ? 'Edit routine' : 'Add menu'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {hasMenu
                      ? dueCount === 0
                        ? 'All done for today'
                        : `${dueCount} left`
                      : 'No menu yet'}
                  </p>
                  <KcalBar logged={kcalLogged} target={targetDER} />
                </div>
              </div>

              {!hasMenu ? (
                <p className="rounded-2xl bg-[#FBF9F5] px-3 py-3 text-sm text-slate-500">
                  Set a daily menu so care shows up here.{' '}
                  <button
                    type="button"
                    className="font-semibold text-[#F59E0B]"
                    onClick={() => onEditMenu?.(dog.id)}
                  >
                    Set up
                  </button>
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onDone={handleDone}
                      onUndo={handleUndo}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpenPack}
        className="w-full py-2 text-center text-sm font-semibold text-slate-400 hover:text-slate-600"
      >
        Manage pack →
      </button>
    </div>
  )
}
