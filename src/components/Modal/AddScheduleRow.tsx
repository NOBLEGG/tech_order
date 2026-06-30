import { useEffect, useRef, useState } from 'react'
import { parseISO } from 'date-fns'
import type { Interval, ScheduleMode } from '../../types'
import { advanceScheduleDate, formatDate } from '../../lib/dateUtils'

const INTERVALS: { value: Interval; label: string }[] = [
  { value: 'daily',       label: 'Daily' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-annual' },
  { value: 'annual',      label: 'Annual' },
]

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const getToday = () => formatDate(new Date())

const USE_MONTHDAYS: Interval[] = ['monthly', 'quarterly', 'semi_annual', 'annual']
const FLEXIBLE_INTERVALS: Interval[] = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']

interface Props {
  onAdd: (
    title: string,
    intvl: Interval,
    start_date: string,
    schedule_mode?: ScheduleMode,
    weekdays?: number[],
    monthdays?: number[],
    end_date?: string,
  ) => void
  depth?: number
}

export default function AddScheduleRow({ onAdd, depth = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [intvl, setIntvl] = useState<Interval>('monthly')
  const [timingMode, setTimingMode] = useState<ScheduleMode>('specific')
  const [startDate, setStartDate] = useState(getToday())
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [monthdays, setMonthdays] = useState<number[]>([])
  const [endDate, setEndDate] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  function reset() {
    setTitle(''); setIntvl('monthly'); setTimingMode('specific'); setStartDate(getToday())
    setWeekdays([]); setMonthdays([]); setEndDate('')
    setOpen(false)
  }

  function supportsFlexibleTiming(interval: Interval) {
    return FLEXIBLE_INTERVALS.includes(interval)
  }

  const minEndDate = intvl === 'daily'
    ? startDate
    : intvl === 'monthly'
      ? startDate
    : formatDate(advanceScheduleDate(parseISO(startDate), intvl, 1))

  function toggleWeekday(day: number) {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function toggleMonthday(day: number) {
    setMonthdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function isValid() {
    if (!title.trim()) return false
    if (intvl === 'weekly' && timingMode === 'specific') return weekdays.length > 0
    if (endDate && endDate < minEndDate) return false
    return true
  }

  function commit() {
    if (!isValid()) return
    const ed = endDate || undefined
    const scheduleMode = supportsFlexibleTiming(intvl) ? timingMode : 'specific'
    if (intvl === 'weekly' && timingMode === 'specific') {
      onAdd(title.trim(), intvl, startDate, scheduleMode, weekdays, undefined, ed)
    } else if (USE_MONTHDAYS.includes(intvl) && timingMode === 'specific' && monthdays.length > 0) {
      onAdd(title.trim(), intvl, startDate, scheduleMode, undefined, monthdays, ed)
    } else {
      onAdd(title.trim(), intvl, startDate, scheduleMode, undefined, undefined, ed)
    }
    reset()
  }

  function handleIntervalChange(value: Interval) {
    setIntvl(value)
    setWeekdays([])
    setMonthdays([])
    if (!supportsFlexibleTiming(value)) {
      setTimingMode('specific')
    }
  }

  function handleStartDateChange(value: string) {
    if (value < getToday()) return
    setStartDate(value)
  }

  useEffect(() => {
    if (endDate && endDate < minEndDate) {
      setEndDate('')
    }
  }, [endDate, minEndDate])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !(intvl === 'weekly' && timingMode === 'specific')) commit()
    if (e.key === 'Escape') reset()
  }

  const showStartDate = true
  const showFlexibleMode = supportsFlexibleTiming(intvl)
  const showWeekdays = intvl === 'weekly' && timingMode === 'specific'
  const showMonthdays = USE_MONTHDAYS.includes(intvl) && timingMode === 'specific'
  const selectedDay = parseInt(startDate.split('-')[2])

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className={`text-xs text-gray-300 hover:text-gray-500 py-1 ${depth > 0 ? 'ml-6' : ''}`}
      >
        + 스케줄 추가
      </button>
    )
  }

  return (
    <div className={`py-2 ${depth > 0 ? 'ml-6' : ''}`}>
      <input
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="스케줄 이름"
        className="w-full text-sm border-b border-blue-300 outline-none py-0.5 text-gray-700
                   placeholder-gray-300 bg-transparent mb-3"
      />

      <div className="flex flex-col gap-2.5">
        {/* interval */}
        <select
          value={intvl}
          onChange={e => handleIntervalChange(e.target.value as Interval)}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none
                     bg-white self-start"
        >
          {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>

        {showFlexibleMode && (
          <div className="flex items-center gap-1 self-start">
            <button
              type="button"
              onClick={() => setTimingMode('specific')}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                timingMode === 'specific'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
              }`}
            >
              Specific
            </button>
            <button
              type="button"
              onClick={() => setTimingMode('flexible')}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                timingMode === 'flexible'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
              }`}
            >
              Anytime
            </button>
          </div>
        )}

        {/* weekday 토글 */}
        {showWeekdays && (
          <div className="flex gap-1 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => (
              <button key={day} type="button" onClick={() => toggleWeekday(day)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors
                        ${weekdays.includes(day) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* monthday 그리드 */}
        {showMonthdays && (
          <div>
            <div className="flex flex-wrap gap-1">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleMonthday(day)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors
                          ${monthdays.includes(day) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {day}
                </button>
              ))}
            </div>
            {monthdays.some(d => d >= 29) && (
              <p className="text-xs text-amber-400 mt-1">29일 이상은 짧은 달에서 말일로 처리됩니다</p>
            )}
          </div>
        )}

        {/* 시작일 / 반복 종료일 */}
        {showStartDate && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              min={getToday()}
              onChange={e => handleStartDateChange(e.target.value)}
              aria-label="시작일"
              className="text-xs border border-gray-200 rounded px-2 py-1 outline-none"
            />
            <span className="text-xs text-gray-300">~</span>
            <input
              type="date"
              value={endDate}
              min={minEndDate}
              onChange={e => setEndDate(e.target.value)}
              aria-label="반복 종료일"
              className="text-xs border border-gray-200 rounded px-2 py-1 outline-none"
            />
            {endDate && (
              <button
                type="button"
                onClick={() => setEndDate('')}
                className="text-xs text-gray-300 hover:text-gray-500"
                aria-label="반복 종료일 초기화"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {intvl !== 'daily' && (
          <p className="text-xs text-amber-400">
            종료일은 시작일 이후로만 선택할 수 있습니다.
          </p>
        )}
        {!showFlexibleMode && !showMonthdays && selectedDay >= 29 && (
          <span className="text-xs text-amber-400">
            29일 이상은 짧은 달에서 말일로 처리됩니다
          </span>
        )}

        {/* 버튼 */}
        <div className="flex items-center gap-2">
          <button onClick={commit} disabled={!isValid()}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium
                             disabled:text-gray-300 disabled:cursor-not-allowed">
            추가
          </button>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
