import {
  eachDayOfInterval, startOfMonth, endOfMonth, startOfDay,
  addDays, addWeeks, addMonths, addQuarters, addYears,
  isSameDay, parseISO, format, getDay, getDate, getMonth, getYear,
} from 'date-fns'
import type { Interval, Schedule } from '../types'

export function getDaysInMonth(date: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) })
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'M/d')
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

  if (end && startOfDay(date) > end) return false

  if (schedule.intvl === 'daily') {
    return date >= origin
  }

  if (schedule.intvl === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return false
    return date >= origin && schedule.weekdays.includes(getDay(date))
  }

  if (date < origin) return false

  if (schedule.monthdays && schedule.monthdays.length > 0) {
    const monthsPerInterval = MONTHS_PER_INTERVAL[schedule.intvl] ?? 1
    const monthsElapsed =
      (getYear(date) - getYear(origin)) * 12 + (getMonth(date) - getMonth(origin))
    if (monthsElapsed < 0 || monthsElapsed % monthsPerInterval !== 0) return false
    return isMonthDayMatch(date, schedule.monthdays)
  }

  // monthdays 없으면 단일 날짜 기반 계산
  let n = 0
  while (true) {
    const candidate = advanceN(schedule.intvl, origin, n)
    if (candidate > date) break
    if (isSameDay(candidate, date)) return true
    n++
  }
  return false
}
