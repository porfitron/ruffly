/** Catalog med cadence + 14-day course window (same stop count as Search). */

import {
  addLocalDays,
  dateInputFromDate,
  dayFromDateInput,
  isSameLocalDay,
  startOfLocalDay,
} from './todayCare'

export const MED_SCHEDULES = ['as_needed', 'daily', 'weekly', 'monthly']

export const MED_SCHEDULE_OPTIONS = [
  { value: 'as_needed', label: 'As needed' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

/** Same 14 stops as Search’s date slider; the right end means no end date. */
export const COURSE_RANGE_DAYS = 14

const SCHEDULE_LABELS = {
  as_needed: 'As needed',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export function normalizeMedSchedule(value) {
  return MED_SCHEDULES.includes(value) ? value : 'daily'
}

export function formatMedScheduleLabel(schedule) {
  return SCHEDULE_LABELS[normalizeMedSchedule(schedule)] ?? 'Daily'
}

/** YYYY-MM-DD or null. */
export function normalizeCourseDate(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const parsed = dayFromDateInput(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return dateInputFromDate(parsed)
}

export function addLocalMonths(date, months) {
  const d = startOfLocalDay(date)
  const day = d.getDate()
  const next = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return startOfLocalDay(next)
}

function parseCourseDay(isoDate) {
  const normalized = normalizeCourseDate(isoDate)
  return normalized ? dayFromDateInput(normalized) : null
}

function dayOffset(from, to) {
  const a = startOfLocalDay(from)
  const b = startOfLocalDay(to)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function inMedCourseWindow(item, day = new Date()) {
  const d = startOfLocalDay(day)
  const start = parseCourseDay(item?.courseStart)
  const end = parseCourseDay(item?.courseEnd)
  if (start && d.getTime() < start.getTime()) return false
  if (end && d.getTime() > end.getTime()) return false
  return true
}

function lastMedLogBefore(logs, dogId, careItemId, day) {
  const cutoff = startOfLocalDay(day).getTime()
  let latest = null
  let latestMs = -1
  for (const log of logs ?? []) {
    if (log.dogId !== dogId || log.careItemId !== careItemId) continue
    if (log.kind && log.kind !== 'med') continue
    const t = new Date(log.loggedAt ?? 0).getTime()
    if (!Number.isFinite(t)) continue
    if (startOfLocalDay(new Date(t)).getTime() >= cutoff) continue
    if (t > latestMs) {
      latestMs = t
      latest = log
    }
  }
  return latest
}

function hasMedLogOnDay(logs, dogId, careItemId, day) {
  return (logs ?? []).some(
    (log) =>
      log.dogId === dogId &&
      log.careItemId === careItemId &&
      (!log.kind || log.kind === 'med') &&
      isSameLocalDay(log.loggedAt, day),
  )
}

function addInterval(day, schedule) {
  if (schedule === 'monthly') return addLocalMonths(day, 1)
  if (schedule === 'weekly') return addLocalDays(day, 7)
  return addLocalDays(day, 1)
}

function shortDateLabel(day) {
  return startOfLocalDay(day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Slider index 0 = today; max = no end date (ongoing). */
export function datesFromCourseRange(startIndex, endIndex, today = new Date()) {
  const origin = startOfLocalDay(today)
  const start = clamp(Number(startIndex) || 0, 0, COURSE_RANGE_DAYS)
  const end = clamp(Number(endIndex) || 0, start, COURSE_RANGE_DAYS)
  return {
    courseStart: dateInputFromDate(addLocalDays(origin, start)),
    courseEnd:
      end >= COURSE_RANGE_DAYS
        ? null
        : dateInputFromDate(addLocalDays(origin, end)),
  }
}

export function courseRangeFromDates(
  courseStart,
  courseEnd,
  today = new Date(),
) {
  const origin = startOfLocalDay(today)
  let start = 0
  if (courseStart) {
    start = clamp(dayOffset(origin, dayFromDateInput(courseStart)), 0, COURSE_RANGE_DAYS)
  }
  let end = COURSE_RANGE_DAYS
  if (courseEnd) {
    end = clamp(dayOffset(origin, dayFromDateInput(courseEnd)), 0, COURSE_RANGE_DAYS)
  }
  if (end < start) end = start
  return [start, end]
}

export function courseStartLabel(index, today = new Date()) {
  if (index === 0) return 'Today'
  return shortDateLabel(addLocalDays(startOfLocalDay(today), index))
}

export function courseEndLabel(index, today = new Date()) {
  if (index >= COURSE_RANGE_DAYS) return 'No end'
  if (index === 0) return 'Today'
  return shortDateLabel(addLocalDays(startOfLocalDay(today), index))
}

export function formatMedScheduleSummary(item) {
  if (!item || item.kind !== 'med') return ''
  const schedule = normalizeMedSchedule(item.schedule)
  const parts = [formatMedScheduleLabel(schedule)]
  const start = parseCourseDay(item.courseStart)
  const end = parseCourseDay(item.courseEnd)
  if (start && end) {
    parts.push(`${shortDateLabel(start)} – ${shortDateLabel(end)}`)
  } else if (start) {
    parts.push(`From ${shortDateLabel(start)}`)
  } else if (end) {
    parts.push(`Through ${shortDateLabel(end)}`)
  }
  return parts.join(' · ')
}

export function medSchedulePayload(schedule, range) {
  const dates = datesFromCourseRange(
    range?.[0] ?? 0,
    range?.[1] ?? COURSE_RANGE_DAYS,
  )
  return {
    schedule: normalizeMedSchedule(schedule),
    courseStart: dates.courseStart,
    courseEnd: dates.courseEnd,
  }
}

/** Daily / weekly / monthly courses belong on the menu so the next dose can show. */
export function medRepeatsOnMenu(item) {
  if (!item || item.kind !== 'med') return false
  const schedule = normalizeMedSchedule(item.schedule)
  return (
    schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly'
  )
}

/**
 * Menu slot for a med: weekly / monthly / as-needed use the catalog cadence.
 * Daily meds can sit at breakfast, evening, or daily.
 */
export function menuSlotForMed(careItem, timeSlot = 'daily') {
  const schedule = normalizeMedSchedule(careItem?.schedule)
  if (
    schedule === 'weekly' ||
    schedule === 'monthly' ||
    schedule === 'as_needed'
  ) {
    return schedule
  }
  const slot = String(timeSlot ?? 'daily').toLowerCase()
  if (slot === 'breakfast' || slot === 'evening' || slot === 'daily') return slot
  return 'daily'
}

/**
 * Whether this catalog med should appear on a dog's Today list for `day`.
 * Daily / as-needed: every day in the course window.
 * Weekly / monthly: the next dose (overdue still shows today when there is
 * no end date); past days only show the scheduled day or a log that day.
 */
export function isMedDueOnDay(
  item,
  logs,
  dogId,
  day = new Date(),
  now = new Date(),
) {
  if (!item || item.kind !== 'med') return true
  if (!inMedCourseWindow(item, day)) return false

  const schedule = normalizeMedSchedule(item.schedule)
  if (schedule === 'as_needed' || schedule === 'daily') return true

  const viewingToday = isSameLocalDay(day, now)
  if (hasMedLogOnDay(logs, dogId, item.id, day)) return true

  const last = lastMedLogBefore(logs, dogId, item.id, day)
  if (!last) {
    const firstDue = parseCourseDay(item.courseStart)
    if (!firstDue) return viewingToday
    if (isSameLocalDay(day, firstDue)) return true
    return viewingToday && startOfLocalDay(day).getTime() > firstDue.getTime()
  }

  const nextDue = addInterval(new Date(last.loggedAt), schedule)
  if (isSameLocalDay(day, nextDue)) return true
  if (viewingToday && startOfLocalDay(day).getTime() >= nextDue.getTime()) {
    return true
  }
  return false
}
