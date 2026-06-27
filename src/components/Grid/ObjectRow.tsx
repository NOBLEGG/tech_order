import { useState } from 'react'
import ScheduleRow from './ScheduleRow'
import type { AppObject, Completion, Schedule } from '../../types'

interface Props {
  object: AppObject
  schedules: Schedule[]
  dates: Date[]
  getCompletion: (scheduleId: string, date: Date) => Completion | undefined
  onOpenCompletion: (schedule: Schedule, date: Date) => void
  onEdit: () => void
}

export default function ObjectRow({
  object,
  schedules,
  dates,
  getCompletion,
  onOpenCompletion,
  onEdit,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const superSchedules = schedules.filter(s => s.obj_id === object.id && s.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <tr className="bg-gray-50 group">
        <td className="border-r border-b border-gray-200 sticky left-0 bg-gray-50
                       font-medium text-sm text-gray-800 whitespace-nowrap pl-2 pr-2 py-2
                       min-w-[180px] max-w-[240px]">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                   style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <path d="M4 2.5l5 3.5-5 3.5V2.5z" />
              </svg>
            </button>
            <button
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
          subSchedules={schedules.filter(sub => sub.parent_id === s.id)
            .sort((a, b) => a.sort_order - b.sort_order)}
          dates={dates}
          getCompletion={getCompletion}
          onOpenCompletion={onOpenCompletion}
          depth={0}
        />
      ))}
    </>
  )
}
