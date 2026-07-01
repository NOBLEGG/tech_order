import ScheduleRow from './ScheduleRow'
import type { AppObject, Completion, Schedule } from '../../types'

interface Props {
  object: AppObject
  schedules: Schedule[]
  dates: Date[]
  completions: Completion[]
  getCompletion: (scheduleId: string, date: Date) => Completion | undefined
  onOpenCompletion: (schedule: Schedule, date: Date) => void
  onEdit: () => void
  expanded: boolean
  onToggleExpanded: () => void
  scheduleExpanded: Record<string, boolean>
  onToggleScheduleExpanded: (scheduleId: string) => void
}

export default function ObjectRow({
  object,
  schedules,
  dates,
  completions,
  getCompletion,
  onOpenCompletion,
  onEdit,
  expanded,
  onToggleExpanded,
  scheduleExpanded,
  onToggleScheduleExpanded,
}: Props) {
  const objectSchedules = schedules.filter(s => s.obj_id === object.id)
  const activeScheduleIds = new Set(objectSchedules.map(s => s.id))
  const superSchedules = objectSchedules.filter(s => s.parent_id === null || !activeScheduleIds.has(s.parent_id))
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <tr className="bg-gray-50 group">
        <td className="border-r border-b border-gray-200 sticky left-0 bg-gray-50
                       font-medium text-sm text-gray-800 whitespace-nowrap pl-2 pr-2 py-2
                       min-w-[180px] max-w-[240px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                   style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <path d="M4 2.5l5 3.5-5 3.5V2.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="truncate flex-1 text-left text-gray-800 hover:text-blue-600 transition-colors"
            >
              {object.title}
            </button>
          </div>
        </td>
        {dates.map(date => (
          <td key={date.toISOString()} className="border-r border-b border-gray-200 w-10 min-w-[2.5rem]" />
        ))}
      </tr>

      {expanded && superSchedules.map(s => (
        <ScheduleRow
          key={s.id}
          schedule={s}
          allSchedules={objectSchedules}
          dates={dates}
          completions={completions}
          getCompletion={getCompletion}
          onOpenCompletion={onOpenCompletion}
          depth={0}
          scheduleExpanded={scheduleExpanded}
          onToggleExpanded={onToggleScheduleExpanded}
        />
      ))}
    </>
  )
}
