import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { FlexibleScheduleSegment } from '../../lib/dateUtils'

const ACTIVE_TONES = [
  'bg-blue-50 border-blue-100 text-blue-700',
  'bg-sky-50 border-sky-100 text-sky-700',
  'bg-cyan-50 border-cyan-100 text-cyan-700',
  'bg-amber-50 border-amber-100 text-amber-700',
  'bg-orange-50 border-orange-100 text-orange-700',
  'bg-rose-50 border-rose-100 text-rose-700',
  'bg-red-50 border-red-100 text-red-700',
]

const COMPLETED_TONE = 'bg-green-50 border-green-100 text-green-700'
const MISSED_TONE = 'bg-red-50 border-red-100 text-red-600'
const FUTURE_TONE = 'bg-slate-50 border-slate-100 text-slate-400'

interface Props {
  segment: FlexibleScheduleSegment
  onOpen: () => void
}

function formatRange(start: Date, end: Date) {
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'M/d')} ~ ${format(end, 'M/d')}`
  }

  return `${format(start, 'yyyy/M/d')} ~ ${format(end, 'yyyy/M/d')}`
}

function formatStatus(segment: FlexibleScheduleSegment, today: Date) {
  switch (segment.status) {
    case 'completed':
      return `완료: ${format(parseISO(segment.completion!.due_date), 'M/d')}`
    case 'missed': {
      const overdueDays = Math.max(1, differenceInCalendarDays(today, segment.periodEnd))
      return `${overdueDays}일 지남`
    }
    case 'future': {
      if (!segment.showCountdown) return '예정'
      const untilStart = Math.max(1, differenceInCalendarDays(segment.periodStart, today))
      return `시작까지 ${untilStart}일`
    }
    case 'active': {
      const remainingDays = differenceInCalendarDays(segment.periodEnd, today)
      return remainingDays <= 0 ? '오늘까지' : `${remainingDays}일 남음`
    }
    default:
      return ''
  }
}

function getTone(segment: FlexibleScheduleSegment) {
  if (segment.status === 'completed') return COMPLETED_TONE
  if (segment.status === 'missed') return MISSED_TONE
  if (segment.status === 'future') return FUTURE_TONE
  return ACTIVE_TONES[Math.max(0, Math.min(6, segment.urgencyLevel - 1))]
}

function getRadiusClass(segment: FlexibleScheduleSegment) {
  if (segment.clippedStart && segment.clippedEnd) return 'rounded-lg'
  if (segment.clippedStart) return 'rounded-r-full rounded-l-sm'
  if (segment.clippedEnd) return 'rounded-l-full rounded-r-sm'
  return 'rounded-full'
}

export default function FlexiblePeriodCell({ segment, onOpen }: Props) {
  const today = new Date()
  const rangeLabel = formatRange(segment.periodStart, segment.periodEnd)
  const statusLabel = formatStatus(segment, today)
  const toneClass = getTone(segment)
  const radiusClass = getRadiusClass(segment)
  const disabled = segment.status === 'future'

  return (
    <td className="border-r border-gray-100 px-1 py-0.5 align-middle" colSpan={segment.colSpan}>
      <button
        type="button"
        onClick={disabled ? undefined : onOpen}
        disabled={disabled}
        title={`${rangeLabel} · ${statusLabel}`}
        className={`flex h-full w-full min-w-0 cursor-pointer text-left transition
                    disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <div
          className={`flex h-5 w-full min-w-0 items-center gap-1.5 border px-2 text-[10px] shadow-sm
                      ${toneClass} ${radiusClass}`}
        >
          <span className="truncate font-medium">{rangeLabel}</span>
          <span className="shrink-0 opacity-70">·</span>
          <span className="shrink-0">{statusLabel}</span>
          <span className="ml-auto shrink-0 rounded-full bg-white/70 px-1.5 text-[9px] font-medium">
            {segment.status === 'active'
              ? `${segment.urgencyLevel}/7`
              : segment.status === 'completed'
                ? '완료'
                : segment.status === 'missed'
                  ? '놓침'
                  : '예정'}
          </span>
        </div>
      </button>
    </td>
  )
}
