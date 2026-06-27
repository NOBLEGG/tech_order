import { useState } from 'react'
import ScheduleRow from './ScheduleRow'
import type { AppObject, Completion, Schedule } from '../../types'

function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

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
            <span className="truncate flex-1">{object.title}</span>
            {object.ref_url && (
              <span
                className="text-gray-300 hover:text-blue-400 flex-shrink-0 transition-colors cursor-pointer"
                title={object.ref_type === 'file' ? '파일 — 모달에서 열기' : '링크 열기'}
                onClick={e => {
                  e.stopPropagation()
                  if (object.ref_type === 'url') window.open(object.ref_url!, '_blank')
                  else onEdit() // 파일은 모달 열어서 signed URL로 접근
                }}
              >
                {object.ref_type === 'file' ? <FileIcon /> : <LinkIcon />}
              </span>
            )}
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300
                         hover:text-gray-500 flex-shrink-0 ml-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
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
