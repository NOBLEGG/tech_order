import {
  eachDayOfInterval, startOfMonth, endOfMonth, startOfDay,
  addDays, addWeeks, addMonths, addQuarters, addYears,
  isSameDay, parseISO, format, getDay, getDate, getMonth, getYear,
  startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  differenceInCalendarDays, isValid,
} from 'date-fns'
import type { Completion, Interval, Schedule, ScheduleMode } from '../types'
import { isNoteOnlyMemo } from './completionMemo'

export function getDaysInMonth(date: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) })
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'M/d')
}

function getScheduleMode(schedule: Schedule): ScheduleMode {
  return schedule.schedule_mode === 'flexible' ? 'flexible' : 'specific'
}

function parseScheduleDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2]) - 1
    const day = Number(dateOnlyMatch[3])
    const lastDay = endOfMonth(new Date(year, month, 1)).getDate()

    return startOfDay(new Date(year, month, Math.min(day, lastDay)))
  }

  const parsed = startOfDay(parseISO(value))
  if (isValid(parsed)) return parsed

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const lastDay = endOfMonth(new Date(year, month, 1)).getDate()

  return startOfDay(new Date(year, month, Math.min(day, lastDay)))
}

export function getFlexiblePeriodBounds(intvl: Interval, date: Date, origin?: Date) {
  switch (intvl) {
    case 'weekly':
      return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) }
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) }
    case 'quarterly':
      return { start: startOfQuarter(date), end: endOfQuarter(date) }
    case 'semi_annual': {
      const year = getYear(date)
      const month = getMonth(date)
      if (month < 6) {
        return { start: startOfYear(date), end: endOfMonth(new Date(year, 5, 1)) }
      }
      return { start: new Date(year, 6, 1), end: endOfYear(date) }
    }
    case 'annual':
      if (origin) {
        const day = startOfDay(date)
        const base = startOfDay(origin)
        let start = base
        const yearsElapsed = getYear(day) - getYear(base)
        if (yearsElapsed !== 0) {
          start = addYears(base, yearsElapsed)
        }
        if (day < start) {
          start = addYears(start, -1)
        }

        return { start, end: addDays(addYears(start, 1), -1) }
      }
      return { start: startOfYear(date), end: endOfYear(date) }
    default:
      return { start: startOfMonth(date), end: endOfMonth(date) }
  }
}

export function getFlexiblePeriodKey(intvl: Interval, date: Date, origin?: Date) {
  return `${intvl}:${formatDate(getFlexiblePeriodBounds(intvl, date, origin).start)}`
}

export type FlexiblePeriodStatus = 'future' | 'active' | 'completed' | 'missed'

export interface FlexibleScheduleSegment {
  key: string
  startIndex: number
  colSpan: number
  periodStart: Date
  periodEnd: Date
  visibleStart: Date
  visibleEnd: Date
  status: FlexiblePeriodStatus
  urgencyLevel: number
  completion?: Completion
  openDate: Date
  clippedStart: boolean
  clippedEnd: boolean
  showCountdown: boolean
}

function getScheduleHardEnd(schedule: Schedule): Date | null {
  const end = parseScheduleDate(schedule.end_date)
  const closedAt = parseScheduleDate(schedule.closed_at)

  if (!end) return closedAt
  if (!closedAt) return end
  return end < closedAt ? end : closedAt
}

export function getRealCompletionInPeriod(
  schedule: Schedule,
  date: Date,
  completions: Completion[],
) {
  if (getScheduleMode(schedule) !== 'flexible' || schedule.intvl === 'daily') return undefined

  const origin = parseScheduleDate(schedule.start_date)
  if (!origin) return undefined
  const targetKey = getFlexiblePeriodKey(schedule.intvl, date, origin)

  return completions
    .filter(completion => {
      if (completion.schedule_id !== schedule.id) return false
      if (isNoteOnlyMemo(completion.memo)) return false

      const completionDate = parseScheduleDate(completion.due_date)
      if (!completionDate) return false
      if (completionDate < origin) return false

      return getFlexiblePeriodKey(schedule.intvl, completionDate, origin) === targetKey
    })
    .sort((a, b) => {
      const byDueDate = a.due_date.localeCompare(b.due_date)
      if (byDueDate !== 0) return byDueDate
      return a.created_at.localeCompare(b.created_at)
    })[0]
}

export function getFlexibleUrgencyLevel(periodStart: Date, periodEnd: Date, today: Date) {
  const totalDays = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1)
  if (totalDays <= 1) return 7

  const elapsedDays = Math.min(
    totalDays,
    Math.max(1, differenceInCalendarDays(today, periodStart) + 1),
  )

  return Math.min(7, Math.max(1, Math.ceil((elapsedDays / totalDays) * 7)))
}

export function buildFlexibleScheduleSegments(
  schedule: Schedule,
  dates: Date[],
  completions: Completion[],
  today = new Date(),
) {
  if (getScheduleMode(schedule) !== 'flexible' || schedule.intvl === 'daily') return []

  const origin = parseScheduleDate(schedule.start_date)
  if (!origin) return []
  const hardEnd = getScheduleHardEnd(schedule)
  const todayDay = startOfDay(today)
  const dayList = dates.map(date => startOfDay(date))
  const segments: FlexibleScheduleSegment[] = []
  let foundFuture = false

  let index = 0
  while (index < dayList.length) {
    const day = dayList[index]
    if (!isScheduleDueOn(schedule, day)) {
      index++
      continue
    }

    const key = getFlexiblePeriodKey(schedule.intvl, day, origin)
    let endIndex = index

    while (endIndex + 1 < dayList.length) {
      const nextDay = dayList[endIndex + 1]
      if (!isScheduleDueOn(schedule, nextDay)) break
      if (getFlexiblePeriodKey(schedule.intvl, nextDay, origin) !== key) break
      endIndex++
    }

    const bounds = getFlexiblePeriodBounds(schedule.intvl, day, origin)
    const boundsStart = startOfDay(bounds.start)
    const boundsEnd = startOfDay(bounds.end)
    const periodStart = boundsStart > origin ? boundsStart : origin
    const periodEnd = hardEnd && hardEnd < boundsEnd ? hardEnd : boundsEnd

    if (periodEnd < periodStart) {
      index = endIndex + 1
      continue
    }

    const visibleStart = dayList[index]
    const visibleEnd = dayList[endIndex]
    const completion = getRealCompletionInPeriod(schedule, day, completions)
    const status: FlexiblePeriodStatus = completion
      ? 'completed'
      : todayDay < periodStart
        ? 'future'
        : todayDay > periodEnd
          ? 'missed'
          : 'active'

    const urgencyLevel = status === 'active'
      ? getFlexibleUrgencyLevel(periodStart, periodEnd, todayDay)
      : 0

    segments.push({
      key,
      startIndex: index,
      colSpan: endIndex - index + 1,
      periodStart,
      periodEnd,
      visibleStart,
      visibleEnd,
      status,
      urgencyLevel,
      completion,
      openDate: completion
        ? parseScheduleDate(completion.due_date) ?? todayDay
        : status === 'active'
          ? todayDay
          : visibleEnd,
      clippedStart: visibleStart > periodStart,
      clippedEnd: visibleEnd < periodEnd,
      showCountdown: status === 'future' && !foundFuture,
    })

    if (status === 'future' && !foundFuture) {
      foundFuture = true
    }

    index = endIndex + 1
  }

  return segments
}

export function hasRealCompletionInPeriod(
  schedule: Schedule,
  date: Date,
  completions: Completion[],
) {
  return !!getRealCompletionInPeriod(schedule, date, completions)
}

function advanceN(interval: Interval, origin: Date, n: number): Date {
  switch (interval) {
    case 'daily':       return addDays(origin, n)
    case 'weekly':      return addWeeks(origin, n)
    case 'monthly':     return addMonths(origin, n)
    case 'quarterly':   return addQuarters(origin, n)
    case 'semi_annual': return addMonths(origin, n * 6)
    case 'annual':      return addYears(origin, n)
    default:            return addMonths(origin, n)
  }
}

const MONTHS_PER_INTERVAL: Partial<Record<Interval, number>> = {
  monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
}

function isMonthDayMatch(date: Date, monthdays: number[]): boolean {
  const day = getDate(date)
  const lastDay = endOfMonth(date).getDate()
  if (monthdays.includes(day)) return true
  // 말일 처리: 이 달의 마지막 날이고, monthdays 중 이 달 일수를 초과하는 값이 있으면
  if (day === lastDay && monthdays.some(d => d > lastDay)) return true
  return false
}

export function isScheduleDueOn(schedule: Schedule, date: Date): boolean {
  const origin = parseScheduleDate(schedule.start_date)
  const end = parseScheduleDate(schedule.end_date)
  const closedAt = parseScheduleDate(schedule.closed_at)
  const day = startOfDay(date)

  if (!origin) return false

  if (end && day > end) return false
  if (closedAt && day > closedAt) return false

  if (getScheduleMode(schedule) === 'flexible' && schedule.intvl !== 'daily') {
    if (day < origin) return false
    const { start, end: periodEnd } = getFlexiblePeriodBounds(schedule.intvl, day, origin)
    return day >= start && day <= periodEnd
  }

  if (schedule.intvl === 'daily') {
    return day >= origin
  }

  if (schedule.intvl === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return false
    return day >= origin && schedule.weekdays.includes(getDay(day))
  }

  if (day < origin) return false

  if (schedule.monthdays && schedule.monthdays.length > 0) {
    const monthsPerInterval = MONTHS_PER_INTERVAL[schedule.intvl] ?? 1
    const monthsElapsed =
      (getYear(day) - getYear(origin)) * 12 + (getMonth(day) - getMonth(origin))
    if (monthsElapsed < 0 || monthsElapsed % monthsPerInterval !== 0) return false
    return isMonthDayMatch(day, schedule.monthdays)
  }

  // monthdays 없으면 단일 날짜 기반 계산
  let n = 0
  while (true) {
    const candidate = advanceN(schedule.intvl, origin, n)
    if (candidate > day) break
    if (isSameDay(candidate, day)) return true
    n++
  }
  return false
}
