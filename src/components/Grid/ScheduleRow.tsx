import { useState } from 'react'
import Cell from './Cell'
import FlexiblePeriodCell from './FlexiblePeriodCell'
import type { Completion, Schedule } from '../../types'
import { isAfter, isBefore, startOfDay } from 'date-fns'
import { buildFlexibleScheduleSegments } from '../../lib/dateUtils'

const INTERVAL_LABELS: Record<Schedule['intvl'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-annual',
  annual: 'Annual',
}

function getScheduleBadge(schedule: Schedule) {
  const interval = INTERVAL_LABELS[schedule.intvl]
  if (schedule.intvl === 'daily') return interval
  return `${interval} · ${schedule.schedule_mode === 'flexible' ? 'Anytime' : 'Specific'}`
}

interface Props {
  schedule: Schedule
  subSchedules: Schedule[]
  dates: Date[]
  completions: Completion[]
  getCompletion: (scheduleId: string, date: Date) => Completion | undefined
  onOpenCompletion: (schedule: Schedule, date: Date) => void
  depth: number
}

const today = startOfDay(new Date())

export default function ScheduleRow({
  schedule,
  subSchedules,
  dates,
  completions,
  getCompletion,
  onOpenCompletion,
  depth,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasSubs = subSchedules.length > 0
  const indent = depth === 0 ? 'pl-4' : 'pl-8'
  const isFlexible = schedule.schedule_mode === 'flexible'
  const flexibleSegments = isFlexible ? buildFlexibleScheduleSegments(schedule, dates, completions) : []

  const renderedCells = isFlexible
    ? (() => {
        const cells: JSX.Element[] = []
        let cursor = 0

        if (flexibleSegments.length === 0) {
          cells.push(
            <td
              key="flex-gap-full"
              colSpan={dates.length}
              className="border-r border-b border-gray-100 bg-white"
            />,
          )
          return cells
        }

        flexibleSegments.forEach(segment => {
          if (cursor < segment.startIndex) {
            cells.push(
              <td
                key={`gap-${cursor}-${segment.startIndex}`}
                colSpan={segment.startIndex - cursor}
                className="border-r border-b border-gray-100 bg-white"
              />,
            )
          }

          cells.push(
            <FlexiblePeriodCell
              key={segment.key}
              segment={segment}
              onOpen={() => onOpenCompletion(schedule, segment.openDate)}
            />,
          )

          cursor = segment.startIndex + segment.colSpan
        })

        if (cursor < dates.length) {
          cells.push(
            <td
              key={`gap-tail-${cursor}`}
              colSpan={dates.length - cursor}
              className="border-r border-b border-gray-100 bg-white"
            />,
          )
        }

        return cells
      })()
    : dates.map(date => {
        const isFuture = isAfter(startOfDay(date), today)
        const completion = getCompletion(schedule.id, date)

        return (
          <Cell
            key={date.toISOString()}
            schedule={schedule}
            date={date}
            completion={completion}
            isPast={isBefore(startOfDay(date), today)}
            isFuture={isFuture}
            onOpen={() => onOpenCompletion(schedule, date)}
          />
        )
      })

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
            <span className="shrink-0 rounded-full border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">
              {getScheduleBadge(schedule)}
            </span>
          </div>
        </td>
        {renderedCells}
      </tr>

      {expanded && hasSubs && subSchedules.map(sub => (
        <ScheduleRow
          key={sub.id}
          schedule={sub}
          subSchedules={[]}
          dates={dates}
          completions={completions}
          getCompletion={getCompletion}
          onOpenCompletion={onOpenCompletion}
          depth={depth + 1}
        />
      ))}
    </>
  )
}
