import { useRef, useState } from 'react'
import type { Interval } from '../../types'
import { formatDate } from '../../lib/dateUtils'

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
const today = formatDate(new Date())

const USE_MONTHDAYS: Interval[] = ['monthly', 'quarterly', 'semi_annual', 'annual']

interface Props {
  onAdd: (title: string, intvl: Interval, start_date: string, weekdays?: number[], monthdays?: number[], end_date?: string) => void
  depth?: number
}

export default function AddScheduleRow({ onAdd, depth = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [intvl, setIntvl] = useState<Interval>('monthly')
  const [startDate, setStartDate] = useState(today)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [monthdays, setMonthdays] = useState<number[]>([])
  const [endDate, setEndDate] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  function reset() {
    setTitle(''); setIntvl('monthly'); setStartDate(today)
    setWeekdays([]); setMonthdays([]); setEndDate('')
    setOpen(false)
  }

  function toggleWeekday(day: number) {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function toggleMonthday(day: number) {
    setMonthdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function isValid() {
    if (!title.trim()) return false
    if (intvl === 'weekly') return weekdays.length > 0
    return true
  }

  function commit() {
    if (!isValid()) return
    const ed = endDate || undefined
    if (intvl === 'weekly') {
      onAdd(title.trim(), intvl, startDate, weekdays, undefined, ed)
    } else if (USE_MONTHDAYS.includes(intvl) && monthdays.length > 0) {
      onAdd(title.trim(), intvl, startDate, undefined, monthdays, ed)
    } else {
      onAdd(title.trim(), intvl, startDate, undefined, undefined, ed)
    }
    reset()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && intvl !== 'weekly') commit()
    if (e.key === 'Escape') reset()
  }

  const showStartDate = true
  const showWeekdays = intvl === 'weekly'
  const showMonthdays = USE_MONTHDAYS.includes(intvl)
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
          onChange={e => { setIntvl(e.target.value as Interval); setWeekdays([]); setMonthdays([]) }}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none
                     bg-white self-start"
        >
          {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>

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

        {/* 시작일 / 마침일 */}
        {showStartDate && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              aria-label="시작일"
              className="text-xs border border-gray-200 rounded px-2 py-1 outline-none"
            />
            <span className="text-xs text-gray-300">~</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              aria-label="마침일"
              className="text-xs border border-gray-200 rounded px-2 py-1 outline-none"
            />
            {endDate && (
              <button
                type="button"
                onClick={() => setEndDate('')}
                className="text-xs text-gray-300 hover:text-gray-500"
                aria-label="마침일 초기화"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {!showMonthdays && selectedDay >= 29 && (
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
