import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import { formatScheduleLabel } from './ScheduleItem'

interface Props {
  scheduleId: string
  onClose: () => void
}

export default function ScheduleModal({ scheduleId, onClose }: Props) {
  const { schedules, closedSchedules, updateSchedule, closeSchedule, restoreClosedSchedule, deleteSchedule } = useData()
  const schedule = schedules.find(s => s.id === scheduleId) ?? closedSchedules.find(s => s.id === scheduleId)

  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(schedule?.title ?? '')
  const [descriptionValue, setDescriptionValue] = useState(schedule?.description ?? '')

  useEffect(() => { setTitleValue(schedule?.title ?? '') }, [schedule?.title])
  useEffect(() => { setDescriptionValue(schedule?.description ?? '') }, [schedule?.description])

  if (!schedule) return null

  async function commitTitle() {
    setTitleEditing(false)
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== schedule!.title) {
      await updateSchedule(schedule!.id, { title: trimmed })
    } else {
      setTitleValue(schedule!.title)
    }
  }

  async function commitDescription() {
    const trimmed = descriptionValue.trim()
    if (trimmed !== (schedule!.description ?? '')) {
      await updateSchedule(schedule!.id, { description: trimmed || null })
    }
  }

  async function handleCloseSchedule() {
    if (!window.confirm(`"${schedule!.title}" 스케줄을 마칠까요?`)) return
    const closed = await closeSchedule(schedule!.id)
    if (closed) onClose()
  }

  async function handleRestoreSchedule() {
    const restored = await restoreClosedSchedule(schedule!.id)
    if (restored) onClose()
  }

  async function handleTrashSchedule() {
    if (!window.confirm(`"${schedule!.title}" 스케줄을 휴지통으로 옮길까요?`)) return
    const trashed = await deleteSchedule(schedule!.id)
    if (trashed) onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex-1 mr-4 min-w-0">
            {titleEditing ? (
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitTitle()
                  if (e.key === 'Escape') { setTitleValue(schedule.title); setTitleEditing(false) }
                }}
                className="text-base font-semibold text-gray-800 border-b border-blue-400 outline-none
                           w-full bg-transparent"
              />
            ) : (
              <h2
                className="text-base font-semibold text-gray-800 cursor-text hover:text-gray-600 truncate"
                onClick={() => setTitleEditing(true)}
              >
                {schedule.title}
              </h2>
            )}
            <span className="mt-1 inline-block rounded-full border border-gray-200 px-1.5 py-0.5
                             text-[10px] text-gray-400">
              {formatScheduleLabel(schedule)}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 mt-0.5 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="block">
            <span className="block text-xs text-gray-400 font-medium mb-1.5">설명</span>
            <textarea
              value={descriptionValue}
              onChange={e => setDescriptionValue(e.target.value)}
              onBlur={commitDescription}
              placeholder="이 스케줄이 무엇을 위한 것인지 적어두세요 (선택)"
              className="w-full h-24 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2
                         outline-none focus:border-blue-300 placeholder-gray-300"
            />
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {schedule.closed_at === null ? (
              <button onClick={handleCloseSchedule} className="text-xs text-gray-400 hover:text-gray-700">
                스케줄 마침
              </button>
            ) : (
              <button onClick={handleRestoreSchedule} className="text-xs text-blue-500 hover:text-blue-700">
                복원
              </button>
            )}
            <button onClick={handleTrashSchedule} className="text-xs text-red-300 hover:text-red-500">
              휴지통
            </button>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
