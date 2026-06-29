import {
  eachDayOfInterval, startOfMonth, endOfMonth, startOfDay,
  addDays, addWeeks, addMonths, addQuarters, addYears,
  isSameDay, parseISO, format, getDay, getDate, getMonth, getYear,
  startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
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

export function getFlexiblePeriodBounds(intvl: Interval, date: Date) {
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
      return { start: startOfYear(date), end: endOfYear(date) }
    default:
      return { start: startOfMonth(date), end: endOfMonth(date) }
  }
}

export function getFlexiblePeriodKey(intvl: Interval, date: Date) {
  return `${intvl}:${formatDate(getFlexiblePeriodBounds(intvl, date).start)}`
}

export function hasRealCompletionInPeriod(
  schedule: Schedule,
  date: Date,
  completions: Completion[],
) {
  if (getScheduleMode(schedule) !== 'flexible' || schedule.intvl === 'daily') return false

  const origin = startOfDay(parseISO(schedule.start_date))
  const targetKey = getFlexiblePeriodKey(schedule.intvl, date)

  return completions.some(completion => {
    if (completion.schedule_id !== schedule.id) return false
    if (isNoteOnlyMemo(completion.memo)) return false

    const completionDate = startOfDay(parseISO(completion.due_date))
    if (completionDate < origin) return false

    return getFlexiblePeriodKey(schedule.intvl, completionDate) === targetKey
  })
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
  const origin = startOfDay(parseISO(schedule.start_date))
  const end = schedule.end_date ? startOfDay(parseISO(schedule.end_date)) : null
  const closedAt = schedule.closed_at ? startOfDay(parseISO(schedule.closed_at)) : null
  const day = startOfDay(date)

  if (end && day > end) return false
  if (closedAt && day > closedAt) return false

  if (getScheduleMode(schedule) === 'flexible' && schedule.intvl !== 'daily') {
    if (day < origin) return false
    const { start, end: periodEnd } = getFlexiblePeriodBounds(schedule.intvl, day)
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
