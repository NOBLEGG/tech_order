import { useEffect, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useData } from '../../context/DataContext'
import ScheduleItem, { formatScheduleLabel } from './ScheduleItem'
import AddScheduleRow from './AddScheduleRow'
import ReferenceSection from './ReferenceSection'
import ScheduleModal from './ScheduleModal'
import type { Interval, ScheduleMode } from '../../types'

interface Props {
  objectId: string
  onClose: () => void
}

export default function ObjectModal({ objectId, onClose }: Props) {
  const {
    objects, schedules, closedSchedules, updateObject, deleteObject, closeObject,
    addSchedule, reorderSchedules, restoreClosedSchedule,
  } = useData()

  const obj = objects.find(o => o.id === objectId)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(obj?.title ?? '')
  const [descriptionValue, setDescriptionValue] = useState(obj?.description ?? '')
  const [closing, setClosing] = useState(false)
  const [closeReview, setCloseReview] = useState('')
  const [savingClose, setSavingClose] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { setTitleValue(obj?.title ?? '') }, [obj?.title])
  useEffect(() => { setDescriptionValue(obj?.description ?? '') }, [obj?.description])

  if (!obj) return null

  const objectSchedules = schedules.filter(s => s.obj_id === objectId)
  const activeScheduleIds = new Set(objectSchedules.map(s => s.id))
  const superSchedules = objectSchedules
    .filter(s => s.parent_id === null || !activeScheduleIds.has(s.parent_id))
    .sort((a, b) => a.sort_order - b.sort_order)
  const closedObjectSchedules = closedSchedules
    .filter(schedule => schedule.obj_id === objectId && schedule.trashed_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  function getSubSchedules(superId: string) {
    return objectSchedules
      .filter(s => s.parent_id === superId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  async function commitTitle() {
    setTitleEditing(false)
    if (titleValue.trim() && titleValue.trim() !== obj!.title) {
      await updateObject(objectId, { title: titleValue.trim() })
    } else {
      setTitleValue(obj!.title)
    }
  }

  async function commitDescription() {
    const trimmed = descriptionValue.trim()
    if (trimmed !== (obj!.description ?? '')) {
      await updateObject(objectId, { description: trimmed || null })
    }
  }

  async function handleSuperDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = superSchedules.findIndex(s => s.id === active.id)
    const newIndex = superSchedules.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    await reorderSchedules(arrayMove(superSchedules, oldIndex, newIndex))
  }

  async function handleSubDragEnd(superId: string, event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const subs = getSubSchedules(superId)
    const oldIndex = subs.findIndex(s => s.id === active.id)
    const newIndex = subs.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    await reorderSchedules(arrayMove(subs, oldIndex, newIndex))
  }

  async function handleAddSuper(
    title: string,
    intvl: Interval,
    start_date: string,
    scheduleMode: ScheduleMode = 'specific',
    weekdays?: number[],
    monthdays?: number[],
    end_date?: string,
    description?: string
  ) {
    await addSchedule(objectId, title, intvl, start_date, scheduleMode, undefined, weekdays, monthdays, end_date, description)
  }

  async function handleAddSub(
    superId: string,
    title: string,
    intvl: Interval,
    start_date: string,
    scheduleMode: ScheduleMode = 'specific',
    weekdays?: number[],
    monthdays?: number[],
    end_date?: string,
    description?: string
  ) {
    await addSchedule(objectId, title, intvl, start_date, scheduleMode, superId, weekdays, monthdays, end_date, description)
  }

  async function handleRestoreClosedSchedule(scheduleId: string) {
    const restored = await restoreClosedSchedule(scheduleId)
    if (!restored) {
      setCloseError('마친 스케줄을 복원하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  async function handleCloseObject() {
    if (!closeReview.trim()) return
    setSavingClose(true)
    setCloseError(null)
    const succeeded = await closeObject(objectId, closeReview)
    setSavingClose(false)
    if (!succeeded) {
      setCloseError('오브젝트를 마치지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          {/* header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <div className="flex-1 mr-4">
              {titleEditing ? (
                <input
                  autoFocus
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitTitle()
                    if (e.key === 'Escape') { setTitleValue(obj.title); setTitleEditing(false) }
                  }}
                  className="text-lg font-semibold text-gray-800 border-b border-blue-400 outline-none
                             w-full bg-transparent"
                />
              ) : (
                <h2
                  className="text-lg font-semibold text-gray-800 cursor-text hover:text-gray-600"
                  onClick={() => setTitleEditing(true)}
                >
                  {obj.title}
                </h2>
              )}
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* description */}
          <div className="px-6 pt-3">
            <p className="text-xs text-gray-400 font-medium mb-1.5">설명</p>
            <textarea
              value={descriptionValue}
              onChange={e => setDescriptionValue(e.target.value)}
              onBlur={commitDescription}
              placeholder="이 오브젝트가 무엇을 위한 것인지 적어두세요 (선택)"
              className="w-full h-20 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2
                         outline-none focus:border-blue-300 placeholder-gray-300"
            />
          </div>

          {/* reference */}
          <div className="px-6 pb-2">
            <ReferenceSection object={obj} onUpdate={updateObject} />
          </div>

          {/* schedules */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSuperDragEnd}>
              <SortableContext items={superSchedules.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {superSchedules.map(sup => {
                  const subs = getSubSchedules(sup.id)
                  return (
                    <ScheduleItem key={sup.id} schedule={sup} depth={0} onOpen={setOpenScheduleId}>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={e => handleSubDragEnd(sup.id, e)}
                      >
                        <SortableContext items={subs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                          {subs.map(sub => (
                            <ScheduleItem key={sub.id} schedule={sub} depth={1} onOpen={setOpenScheduleId} />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <AddScheduleRow
                        depth={1}
                        onAdd={(t, i, d, mode, w, m, e, desc) => handleAddSub(sup.id, t, i, d, mode, w, m, e, desc)}
                      />
                    </ScheduleItem>
                  )
                })}
              </SortableContext>
            </DndContext>

            <AddScheduleRow onAdd={(t, i, d, mode, w, m, e, desc) => handleAddSuper(t, i, d, mode, w, m, e, desc)} />

            {closedObjectSchedules.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-medium text-gray-400">마친 스케줄</p>
                <div className="space-y-2">
                  {closedObjectSchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenScheduleId(schedule.id)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm text-gray-700 hover:text-blue-600">{schedule.title}</p>
                        <p className="text-xs text-gray-400">{formatScheduleLabel(schedule)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestoreClosedSchedule(schedule.id)}
                        className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700"
                      >
                        복원
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {closeError && (
            <div className="px-6 pb-2 text-xs text-red-400">
              {closeError}
            </div>
          )}

          {/* footer */}
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setClosing(true)} className="text-xs text-gray-400 hover:text-gray-700">
                오브젝트 마침
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`"${obj.title}" 오브젝트를 휴지통으로 옮길까요?`)) return
                  await deleteObject(objectId)
                  onClose()
                }}
                className="text-xs text-red-300 hover:text-red-500"
              >
                휴지통
              </button>
            </div>
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
              닫기
            </button>
          </div>

          {closing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl">
              <div className="bg-white border border-gray-100 rounded-xl shadow-lg w-full mx-6">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-gray-800">오브젝트 마침</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    활성 화면에서 숨기고, 히스토리에 남길 리뷰를 저장합니다.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    autoFocus
                    value={closeReview}
                    onChange={e => { setCloseReview(e.target.value); setCloseError(null) }}
                    placeholder="무엇을 끝냈고, 다음에는 무엇을 참고하면 좋을지 적어두세요."
                    className="w-full h-32 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2
                               outline-none focus:border-blue-300"
                  />
                  {closeError && (
                    <p className="text-xs text-red-400 mt-2">{closeError}</p>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    onClick={() => { setClosing(false); setCloseReview('') }}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCloseObject}
                    disabled={savingClose || !closeReview.trim()}
                    className="text-sm text-blue-500 hover:text-blue-700 font-medium disabled:text-gray-300"
                  >
                    {savingClose ? '저장 중...' : '마침'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {openScheduleId && (
        <ScheduleModal scheduleId={openScheduleId} onClose={() => setOpenScheduleId(null)} />
      )}
    </>
  )
}
