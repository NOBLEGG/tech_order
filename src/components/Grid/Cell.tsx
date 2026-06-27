import { isScheduleDueOn } from '../../lib/dateUtils'
import type { Completion, Schedule } from '../../types'

interface Props {
  schedule: Schedule
  date: Date
  completion?: Completion
  isPast: boolean
  onOpen: () => void
}

export default function Cell({ schedule, date, completion, isPast, onOpen }: Props) {
  const due = isScheduleDueOn(schedule, date)
  const isCompleted = !!completion
  const hasMemo = !!completion?.memo?.trim()

  if (!due) {
    return <td className="border-r border-gray-100 w-10 min-w-[2.5rem]" />
  }

  return (
    <td className="border-r border-gray-100 w-10 min-w-[2.5rem] text-center">
      <button
        onClick={onOpen}
        title={hasMemo ? completion!.memo! : '완료 메모 열기'}
        className="relative w-5 h-5 rounded border flex items-center justify-center mx-auto
                   transition-colors"
        style={{
          borderColor: isCompleted ? '#4ade80' : isPast ? '#fca5a5' : '#d1d5db',
          backgroundColor: isCompleted ? '#4ade80' : 'transparent',
        }}
      >
        {isCompleted && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {hasMemo && (
          <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
        )}
      </button>
    </td>
  )
}
