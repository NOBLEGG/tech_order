import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { Completion, Schedule } from '../../types'
import { decodeCompletionMemo, isNoteOnlyMemo } from '../../lib/completionMemo'

interface Props {
  schedule: Schedule
  date: Date
  completion?: Completion
  canToggleCompletion: boolean
  onSave: (scheduleId: string, date: Date, memo: string) => Promise<void>
  onDelete: (completionId: string) => Promise<void>
  onClose: () => void
}

export default function CompletionModal({
  schedule,
  date,
  completion,
  canToggleCompletion,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const isCompleted = !!completion && !isNoteOnlyMemo(completion.memo)
  const [completed, setCompleted] = useState(isCompleted)
  const [memo, setMemo] = useState(decodeCompletionMemo(completion?.memo))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCompleted(!!completion && !isNoteOnlyMemo(completion.memo))
    setMemo(decodeCompletionMemo(completion?.memo))
  }, [completion?.id, completion?.memo])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    if (!canToggleCompletion) {
      if (completion || memo.trim()) {
        await onSave(schedule.id, date, memo)
      }
    } else if (completed) {
      await onSave(schedule.id, date, memo)
    } else if (completion) {
      await onDelete(completion.id)
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0 pr-4">
            <p className="text-xs text-gray-400 mb-1">{format(date, 'yyyy년 M월 d일')}</p>
            <h2 className="text-base font-semibold text-gray-800 truncate">{schedule.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={canToggleCompletion ? completed : isCompleted}
              onChange={e => setCompleted(e.target.checked)}
              disabled={!canToggleCompletion}
              className="w-4 h-4 accent-green-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
            완료로 기록
          </label>

          {!canToggleCompletion && (
            <p className="mb-3 text-xs text-gray-400">
              완료 상태는 오늘만 바꿀 수 있고, 메모는 남기거나 수정할 수 있어요.
            </p>
          )}

          <label className="block">
            <span className="block text-xs text-gray-400 font-medium mb-1.5">메모</span>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              disabled={canToggleCompletion ? !completed : false}
              placeholder="남은 문제, 다음에 다룰 점, 참고할 생각을 적어두세요."
              className="w-full h-32 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2
                         outline-none focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
            />
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm text-blue-500 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
