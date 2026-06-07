import { useState } from 'react'
import Cell from './Cell'
import type { Schedule } from '../../types'
import { isBefore, startOfDay } from 'date-fns'

interface Props {
  schedule: Schedule
  subSchedules: Schedule[]
  dates: Date[]
  isCompleted: (scheduleId: string, date: Date) => boolean
  onToggle: (scheduleId: string, date: Date) => void
  depth: number
}

const today = startOfDay(new Date())

export default function ScheduleRow({ schedule, subSchedules, dates, isCompleted, onToggle, depth }: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasSubs = subSchedules.length > 0
  const indent = depth === 0 ? 'pl-4' : 'pl-8'

  return (
    <>
      <tr className="hover:bg-gray-50 group">
        <td className={`border-r border-b border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50
                        text-xs text-gray-600 whitespace-nowrap ${indent} pr-2 py-1.5 min-w-[180px] max-w-[240px]`}>
          <div className="flex items-center gap-1">
            {hasSubs && (
              <button onClick={() => setExpanded(e => !e)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
                     style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                  <path d="M3 2l4 3-4 3V2z" />
                </svg>
              </button>
            )}
            {!hasSubs && <span className="w-[10px] flex-shrink-0" />}
            <span className="truncate">{schedule.title}</span>
            <span className="ml-1 text-gray-300 text-[10px] flex-shrink-0">
              {intvlLabel(schedule.intvl)}
            </span>
          </div>
        </td>
        {dates.map(date => (
          <Cell
            key={date.toISOString()}
            schedule={schedule}
            date={date}
            isCompleted={isCompleted(schedule.id, date)}
            isPast={isBefore(startOfDay(date), today)}
            onToggle={() => onToggle(schedule.id, date)}
          />
        ))}
      </tr>

      {expanded && hasSubs && subSchedules.map(sub => (
        <ScheduleRow
          key={sub.id}
          schedule={sub}
          subSchedules={[]}
          dates={dates}
          isCompleted={isCompleted}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </>
  )
}

function intvlLabel(intvl: string) {
  const map: Record<string, string> = {
    daily: '매일', weekly: '매주', monthly: '매월',
    quarterly: '분기', semi_annual: '반기', annual: '매년',
  }
  return map[intvl] ?? intvl
}
