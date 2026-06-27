import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Schedule, Interval } from '../../types'

const INTERVALS: { value: Interval; label: string }[] = [
  { value: 'daily',       label: 'D' },
  { value: 'weekly',      label: 'W' },
  { value: 'monthly',     label: 'M' },
  { value: 'quarterly',   label: 'Q' },
  { value: 'semi_annual', label: 'S' },
  { value: 'annual',      label: 'A' },
]

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function weekdayDisplay(weekdays: number[] | null) {
  if (!weekdays || weekdays.length === 0) return 'W'
  return [...weekdays].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(',')
}

function monthdayDisplay(intvl: string, monthdays: number[] | null) {
  const label: Record<string, string> = {
    monthly: 'M', quarterly: 'Q', semi_annual: 'S', annual: 'A',
  }
  if (!monthdays || monthdays.length === 0) return label[intvl] ?? intvl
  return `${label[intvl]} ${[...monthdays].sort((a, b) => a - b).join(',')}일`
}

interface Props {
  schedule: Schedule
  depth: number
  onUpdate: (id: string, patch: Partial<Schedule>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  children?: React.ReactNode
}

export default function ScheduleItem({ schedule, depth, onUpdate, onDelete, children }: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(schedule.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: schedule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  async function commitTitle() {
    setEditingTitle(false)
    if (title.trim() && title.trim() !== schedule.title) {
      await onUpdate(schedule.id, { title: title.trim() })
    } else {
      setTitle(schedule.title)
    }
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
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitle(schedule.title); setEditingTitle(false) } }}
            className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent py-0.5"
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-700 cursor-text hover:text-gray-900"
            onClick={() => setEditingTitle(true)}
          >
            {schedule.title}
          </span>
        )}

        {/* interval */}
        {schedule.intvl === 'weekly' ? (
          <span className="text-xs text-gray-400">{weekdayDisplay(schedule.weekdays)}</span>
        ) : schedule.intvl === 'daily' ? (
          <span className="text-xs text-gray-400">D</span>
        ) : (
          <span className="text-xs text-gray-400">{monthdayDisplay(schedule.intvl, schedule.monthdays)}</span>
        )}

        {/* delete */}
        <button
          onClick={() => onDelete(schedule.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300
                     hover:text-red-400 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* sub-schedules slot */}
      {children}
    </div>
  )
}
