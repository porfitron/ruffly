import { Check, Circle, Minus, PawPrint, Plus } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import DogAvatar from '../profile/DogAvatar'
import { useApp } from '../../context/AppContext'
import { isDogAway } from '../../utils/dogs'
import {
  buildPackTodayTasks,
  estimateFoodKcal,
  kindLabel,
} from '../../utils/todayCare'

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

function TaskRow({ task, onDone, onUndo }) {
  const amount = taskAmount(task)
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        task.done
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
          {task.slotLabel ? ` · ${task.slotLabel}` : ''}
          {amount ? ` · ${amount}` : ''}
        </p>
      </div>
    </li>
  )
}

function MealRow({ meal, onDone, onUndo, onItemDone, onItemUndo }) {
  return (
    <li
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
                  <span className="shrink-0 tabular-nums text-xs text-slate-400">
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

/** Post-onboarding home — care due today across the pack. */
export default function TodayView({
  onLog,
  onAddDog,
  onOpenPack,
  onEditMenu,
}) {
  const { dogs, catalog, menusByDogId, logs, dispatch } = useApp()
  const groups = buildPackTodayTasks(dogs, menusByDogId, catalog, logs)
  const homeDogs = dogs.filter((dog) => !isDogAway(dog))
  const totalDue = groups.reduce((sum, g) => sum + g.dueCount, 0)
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0)

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
    logTask(task)
  }

  function handleUndo(task) {
    if (task.doneLogId) {
      dispatch({ type: 'DELETE_LOG', payload: task.doneLogId })
    }
  }

  function handleMealDone(meal) {
    for (const item of meal.items) {
      if (!item.done) logTask(item)
    }
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
        {groups.map(({ dog, rows, dueCount, kcalLogged, targetDER, hasMenu }) => (
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
                  {rows.map((row) =>
                    row.type === 'meal' ? (
                      <MealRow
                        key={row.id}
                        meal={row}
                        onDone={handleMealDone}
                        onUndo={handleMealUndo}
                        onItemDone={handleDone}
                        onItemUndo={handleUndo}
                      />
                    ) : (
                      <TaskRow
                        key={row.id}
                        task={row.task}
                        onDone={handleDone}
                        onUndo={handleUndo}
                      />
                    ),
                  )}
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
