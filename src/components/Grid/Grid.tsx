import { useEffect, useMemo, useState } from 'react'
import { addMonths, subMonths, format, isToday, isSunday, isSaturday } from 'date-fns'
import ObjectRow from './ObjectRow'
import AddObjectRow from './AddObjectRow'
import CompletionModal from './CompletionModal'
import HistoryPanel from '../History/HistoryPanel'
import { useData } from '../../context/DataContext'
import { useCompletions } from '../../hooks/useCompletions'
import { getDaysInMonth, formatDisplayDate } from '../../lib/dateUtils'
import type { Schedule } from '../../types'

interface ActiveCompletionCell {
  schedule: Schedule
  date: Date
}

const OBJECT_EXPANDED_STORAGE_KEY = 'tech-order:grid-object-expanded:v1'
const SCHEDULE_EXPANDED_STORAGE_KEY = 'tech-order:grid-schedule-expanded:v1'

function readExpandedMap(storageKey: string) {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'),
    ) as Record<string, boolean>
  } catch {
    return {}
  }
}

function createExpandedMap(ids: string[], expanded: boolean) {
  return Object.fromEntries(ids.map(id => [id, expanded])) as Record<string, boolean>
}

export default function Grid({ onEditObject }: { onEditObject: (id: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeCell, setActiveCell] = useState<ActiveCompletionCell | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [objectExpanded, setObjectExpanded] = useState<Record<string, boolean>>(
    () => readExpandedMap(OBJECT_EXPANDED_STORAGE_KEY),
  )
  const [scheduleExpanded, setScheduleExpanded] = useState<Record<string, boolean>>(
    () => readExpandedMap(SCHEDULE_EXPANDED_STORAGE_KEY),
  )

  const year = currentDate.getFullYear()
  const days = getDaysInMonth(currentDate)

  const {
    objects,
    closedObjects,
    schedules,
    objectClosureReviews,
    loading,
    addObject,
    deleteClosedObject,
  } = useData()
  const objectIds = useMemo(() => objects.map(object => object.id), [objects])
  const scheduleIds = useMemo(() => schedules.map(schedule => schedule.id), [schedules])
  const { completions, getCompletion, saveCompletion, deleteCompletion } = useCompletions(scheduleIds, year)
  const activeCompletion = activeCell ? getCompletion(activeCell.schedule.id, activeCell.date) : undefined
  const hasRows = objectIds.length > 0 || scheduleIds.length > 0
  const allExpanded = hasRows
    ? objectIds.every(id => objectExpanded[id] ?? true) &&
      scheduleIds.every(id => scheduleExpanded[id] ?? true)
    : true
  const allCollapsed = hasRows
    ? objectIds.every(id => objectExpanded[id] === false) &&
      scheduleIds.every(id => scheduleExpanded[id] === false)
    : true

  useEffect(() => {
    window.localStorage.setItem(OBJECT_EXPANDED_STORAGE_KEY, JSON.stringify(objectExpanded))
  }, [objectExpanded])

  useEffect(() => {
    window.localStorage.setItem(SCHEDULE_EXPANDED_STORAGE_KEY, JSON.stringify(scheduleExpanded))
  }, [scheduleExpanded])

  function handleExpandAll() {
    setObjectExpanded(createExpandedMap(objectIds, true))
    setScheduleExpanded(createExpandedMap(scheduleIds, true))
  }

  function handleCollapseAll() {
    setObjectExpanded(createExpandedMap(objectIds, false))
    setScheduleExpanded(createExpandedMap(scheduleIds, false))
  }

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-2">
        <button
          onClick={() => setCurrentDate(d => subMonths(d, 1))}
          className="text-lg leading-none text-gray-400 hover:text-gray-700"
        >
          ‹
        </button>
        <span className="w-24 text-center text-sm font-medium text-gray-700">
          {format(currentDate, 'yyyy년 M월')}
        </span>
        <button
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          className="text-lg leading-none text-gray-400 hover:text-gray-700"
        >
          ›
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="ml-2 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600"
        >
          오늘
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          className="ml-auto rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600"
        >
          히스토리
        </button>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading...
          </div>
        ) : (
          <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-20 min-w-[180px] max-w-[240px] border-b border-r
                             border-gray-200 bg-white px-2 py-2 text-left text-xs font-medium text-gray-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap">Object / Schedule</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleExpandAll}
                        disabled={!hasRows || allExpanded}
                        aria-label="전체 펼치기"
                        title="전체 펼치기"
                        className={`rounded p-0.5 transition ${
                          !hasRows || allExpanded
                            ? 'cursor-not-allowed text-gray-300'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 7l3-3 3 3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        disabled={!hasRows || allCollapsed}
                        aria-label="전체 접기"
                        title="전체 접기"
                        className={`rounded p-0.5 transition ${
                          !hasRows || allCollapsed
                            ? 'cursor-not-allowed text-gray-300'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 5l3 3 3-3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </th>
                {days.map(date => (
                  <th
                    key={date.toISOString()}
                    className={`sticky top-0 z-10 border-b border-r border-gray-200 text-center
                                font-normal w-10 min-w-[2.5rem] py-1.5
                                ${isToday(date) ? 'bg-blue-50 text-blue-500 font-semibold' : 'bg-white'}
                                ${isSunday(date) ? 'text-red-400' : ''}
                                ${isSaturday(date) ? 'text-blue-400' : ''}
                                ${!isToday(date) && !isSunday(date) && !isSaturday(date) ? 'text-gray-400' : ''}`}
                  >
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
                  completions={completions}
                  getCompletion={getCompletion}
                  onOpenCompletion={(schedule, date) => setActiveCell({ schedule, date })}
                  onEdit={() => onEditObject(obj.id)}
                  expanded={objectExpanded[obj.id] ?? true}
                  onToggleExpanded={() => {
                    setObjectExpanded(prev => ({
                      ...prev,
                      [obj.id]: !(prev[obj.id] ?? true),
                    }))
                  }}
                  scheduleExpanded={scheduleExpanded}
                  onToggleScheduleExpanded={scheduleId => {
                    setScheduleExpanded(prev => ({
                      ...prev,
                      [scheduleId]: !(prev[scheduleId] ?? true),
                    }))
                  }}
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
          canToggleCompletion={isToday(activeCell.date)}
          onSave={saveCompletion}
          onDelete={deleteCompletion}
          onClose={() => setActiveCell(null)}
        />
      )}

      {historyOpen && (
        <HistoryPanel
          objects={closedObjects}
          reviews={objectClosureReviews}
          onDeleteHistory={deleteClosedObject}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}
