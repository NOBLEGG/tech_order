import { format, parseISO } from 'date-fns'
import type { AppObject, Schedule } from '../../types'
import { formatScheduleLabel } from '../Modal/ScheduleItem'

interface Props {
  objects: AppObject[]
  trashedObjects: AppObject[]
  trashedSchedules: Schedule[]
  onRestoreObject: (id: string) => Promise<boolean>
  onRestoreSchedule: (id: string) => Promise<boolean>
  onPurgeObject: (id: string) => Promise<boolean>
  onPurgeSchedule: (id: string) => Promise<boolean>
  onClose: () => void
}

function formatTrashedAt(value: string | null) {
  if (!value) return '-'
  return format(parseISO(value), 'yyyy년 M월 d일')
}

export default function TrashPanel({
  objects,
  trashedObjects,
  trashedSchedules,
  onRestoreObject,
  onRestoreSchedule,
  onPurgeObject,
  onPurgeSchedule,
  onClose,
}: Props) {
  const objectMap = new Map(objects.map(object => [object.id, object]))
  const hasItems = trashedObjects.length > 0 || trashedSchedules.length > 0

  async function handleRestoreObject(id: string) {
    await onRestoreObject(id)
  }

  async function handleRestoreSchedule(id: string) {
    await onRestoreSchedule(id)
  }

  async function handlePurgeObject(id: string, title: string) {
    if (!window.confirm(`"${title}" 오브젝트를 영구 삭제할까요?`)) return
    await onPurgeObject(id)
  }

  async function handlePurgeSchedule(id: string, title: string) {
    if (!window.confirm(`"${title}" 스케줄을 영구 삭제할까요?`)) return
    await onPurgeSchedule(id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 h-[75vh] flex flex-col">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">휴지통</h2>
            <p className="text-xs text-gray-400 mt-1">
              실수로 지운 항목을 다시 살리거나, 완전히 없앨 수 있습니다.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!hasItems ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            휴지통이 비어 있습니다.
          </div>
        ) : (
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 md:grid-cols-2">
            <section className="border-r border-gray-100 p-6 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">오브젝트</h3>
                <span className="text-xs text-gray-400">{trashedObjects.length}개</span>
              </div>

              {trashedObjects.length === 0 ? (
                <p className="text-sm text-gray-400">지운 오브젝트가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {trashedObjects.map(object => {
                    const scheduleCount = trashedSchedules.filter(s => s.obj_id === object.id).length
                    return (
                      <div
                        key={object.id}
                        className="rounded-lg border border-gray-100 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{object.title}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              휴지통에 들어간 날 {formatTrashedAt(object.trashed_at)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              스케줄 {scheduleCount}개 포함
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreObject(object.id)}
                              className="text-xs text-blue-500 hover:text-blue-700"
                            >
                              복원
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePurgeObject(object.id, object.title)}
                              className="text-xs text-red-300 hover:text-red-500"
                            >
                              완전 삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="p-6 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">스케줄</h3>
                <span className="text-xs text-gray-400">{trashedSchedules.length}개</span>
              </div>

              {trashedSchedules.length === 0 ? (
                <p className="text-sm text-gray-400">지운 스케줄이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {trashedSchedules.map(schedule => {
                    const objectTitle = objectMap.get(schedule.obj_id)?.title ?? '알 수 없는 오브젝트'
                    return (
                      <div
                        key={schedule.id}
                        className="rounded-lg border border-gray-100 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{schedule.title}</p>
                            <p className="mt-0.5 text-xs text-gray-400">{objectTitle}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {formatScheduleLabel(schedule)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              휴지통에 들어간 날 {formatTrashedAt(schedule.trashed_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreSchedule(schedule.id)}
                              className="text-xs text-blue-500 hover:text-blue-700"
                            >
                              복원
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePurgeSchedule(schedule.id, schedule.title)}
                              className="text-xs text-red-300 hover:text-red-500"
                            >
                              완전 삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
