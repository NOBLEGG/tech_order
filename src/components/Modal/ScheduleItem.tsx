import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Schedule, Interval } from '../../types'

const INTERVAL_LABELS: Record<Interval, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-annual',
  annual: 'Annual',
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FLEXIBLE_INTERVALS: Interval[] = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']

function isFlexibleSchedule(schedule: Schedule) {
  return schedule.schedule_mode === 'flexible'
}

export function formatScheduleLabel(schedule: Schedule) {
  const label = INTERVAL_LABELS[schedule.intvl]

  if (schedule.intvl === 'daily') {
    return label
  }

  if (isFlexibleSchedule(schedule) && FLEXIBLE_INTERVALS.includes(schedule.intvl)) {
    return `${label} · Anytime`
  }

  if (schedule.intvl === 'weekly') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return label
    const days = [...schedule.weekdays].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(', ')
    return `${label} · ${days}`
  }

  if (!schedule.monthdays || schedule.monthdays.length === 0) return label
  const days = [...schedule.monthdays].sort((a, b) => a - b).join(', ')
  return `${label} · ${days}`
}

interface Props {
  schedule: Schedule
  depth: number
  onOpen: (id: string) => void
  children?: React.ReactNode
}

export default function ScheduleItem({ schedule, depth, onOpen, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: schedule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={depth === 1 ? 'ml-6' : ''}>
      <div className="flex items-center gap-2 py-1.5 group">
        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="4" cy="4" r="1.5" /><circle cx="8" cy="4" r="1.5" />
            <circle cx="4" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" />
            <circle cx="4" cy="12" r="1.5" /><circle cx="8" cy="12" r="1.5" />
          </svg>
        </button>

        {/* title */}
        <button
          type="button"
          onClick={() => onOpen(schedule.id)}
          className="flex-1 min-w-0 text-left text-sm text-gray-700 hover:text-blue-600 truncate"
        >
          {schedule.title}
        </button>

        {/* interval */}
        <span className="text-xs text-gray-400 flex-shrink-0">{formatScheduleLabel(schedule)}</span>
      </div>

      {/* sub-schedules slot */}
      {children}
    </div>
  )
}
