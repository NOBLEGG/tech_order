import { isScheduleDueOn } from '../../lib/dateUtils'
import type { Schedule } from '../../types'

interface Props {
  schedule: Schedule
  date: Date
  isCompleted: boolean
  isPast: boolean
  onToggle: () => void
}

export default function Cell({ schedule, date, isCompleted, isPast, onToggle }: Props) {
  const due = isScheduleDueOn(schedule, date)

  if (!due) {
    return <td className="border-r border-gray-100 w-10 min-w-[2.5rem]" />
  }

  return (
    <td className="border-r border-gray-100 w-10 min-w-[2.5rem] text-center">
      <button
        onClick={onToggle}
        className="w-5 h-5 rounded border flex items-center justify-center mx-auto
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
      </button>
    </td>
  )
}
