import { useState } from 'react'
import { addMonths, subMonths, format, isToday, isSunday, isSaturday } from 'date-fns'
import ObjectRow from './ObjectRow'
import AddObjectRow from './AddObjectRow'
import CompletionModal from './CompletionModal'
import { useData } from '../../context/DataContext'
import { useCompletions } from '../../hooks/useCompletions'
import { getDaysInMonth, formatDisplayDate } from '../../lib/dateUtils'
import type { Schedule } from '../../types'

interface ActiveCompletionCell {
  schedule: Schedule
  date: Date
}

export default function Grid({ onEditObject }: { onEditObject: (id: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeCell, setActiveCell] = useState<ActiveCompletionCell | null>(null)
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const days = getDaysInMonth(currentDate)

  const { objects, schedules, loading, addObject } = useData()
  const scheduleIds = schedules.map(s => s.id)
  const { getCompletion, saveCompletion, deleteCompletion } = useCompletions(scheduleIds, year, month)
  const activeCompletion = activeCell ? getCompletion(activeCell.schedule.id, activeCell.date) : undefined

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)]">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none">‹</button>
        <span className="text-sm font-medium text-gray-700 w-24 text-center">
          {format(currentDate, 'yyyy년 M월')}
        </span>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none">›</button>
        <button onClick={() => setCurrentDate(new Date())}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200
                           rounded px-2 py-0.5">
          오늘
        </button>
      </div>

      {/* grid */}
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>
        ) : (
          <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-white border-r border-b border-gray-200
                               text-left font-medium text-gray-400 text-xs px-2 py-2 min-w-[180px] max-w-[240px]">
                  Object / Schedule
                </th>
                {days.map(date => (
                  <th key={date.toISOString()}
                      className={`sticky top-0 z-10 border-r border-b border-gray-200 text-center
                                  font-normal w-10 min-w-[2.5rem] py-1.5
                                  ${isToday(date) ? 'bg-blue-50 text-blue-500 font-semibold' : 'bg-white'}
                                  ${isSunday(date) ? 'text-red-400' : ''}
                                  ${isSaturday(date) ? 'text-blue-400' : ''}
                                  ${!isToday(date) && !isSunday(date) && !isSaturday(date) ? 'text-gray-400' : ''}`}>
                    {formatDisplayDate(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objects.map(obj => (
                <ObjectRow
                  key={obj.id}
                  object={obj}
                  schedules={schedules}
                  dates={days}
                  getCompletion={getCompletion}
                  onOpenCompletion={(schedule, date) => setActiveCell({ schedule, date })}
                  onEdit={() => onEditObject(obj.id)}
                />
              ))}
              <AddObjectRow colCount={days.length} onAdd={addObject} />
            </tbody>
          </table>
        )}
      </div>

      {activeCell && (
        <CompletionModal
          schedule={activeCell.schedule}
          date={activeCell.date}
          completion={activeCompletion}
          onSave={saveCompletion}
          onDelete={deleteCompletion}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  )
}
