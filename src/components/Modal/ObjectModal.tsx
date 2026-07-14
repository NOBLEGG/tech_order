import { useEffect, useRef, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useData } from '../../context/DataContext'
import ScheduleItem, { formatScheduleLabel } from './ScheduleItem'
import AddScheduleRow from './AddScheduleRow'
import ReferenceSection from './ReferenceSection'
import type { Interval, Schedule, ScheduleMode } from '../../types'

const TEMP_ID_PREFIX = 'temp-schedule-'

function cloneSchedule(schedule: Schedule): Schedule {
  return {
    ...schedule,
    weekdays: schedule.weekdays ? [...schedule.weekdays] : null,
    monthdays: schedule.monthdays ? [...schedule.monthdays] : null,
  }
}

function cloneSchedules(list: Schedule[]) {
  return list.map(cloneSchedule).sort((a, b) => a.sort_order - b.sort_order)
}

function isTempSchedule(schedule: Schedule) {
  return schedule.id.startsWith(TEMP_ID_PREFIX)
}

function sameNumberArray(a: number[] | null, b: number[] | null) {
  if (a === b) return true
  if (!a || !b) return a === b
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function buildSchedulePatch(current: Schedule, original: Schedule): Partial<Schedule> {
  const patch: Partial<Schedule> = {}
  if (current.title !== original.title) patch.title = current.title
  if (current.intvl !== original.intvl) patch.intvl = current.intvl
  if (current.start_date !== original.start_date) patch.start_date = current.start_date
  if (current.end_date !== original.end_date) patch.end_date = current.end_date
  if ((current.schedule_mode ?? null) !== (original.schedule_mode ?? null)) {
    patch.schedule_mode = current.schedule_mode ?? null
  }
  if (!sameNumberArray(current.weekdays, original.weekdays)) patch.weekdays = current.weekdays
  if (!sameNumberArray(current.monthdays, original.monthdays)) patch.monthdays = current.monthdays
  if (current.sort_order !== original.sort_order) patch.sort_order = current.sort_order
  return patch
}

function createTempSchedule(
  objectId: string,
  title: string,
  intvl: Interval,
  startDate: string,
  scheduleMode: ScheduleMode,
  parentId: string | null,
  sortOrder: number,
  weekdays?: number[],
  monthdays?: number[],
  endDate?: string,
): Schedule {
  return {
    id: `${TEMP_ID_PREFIX}${crypto.randomUUID()}`,
    obj_id: objectId,
    parent_id: parentId,
    title: title.trim(),
    intvl,
    schedule_mode: scheduleMode,
    start_date: startDate,
    end_date: endDate ?? null,
    weekdays: weekdays && weekdays.length > 0 ? [...weekdays] : null,
    monthdays: monthdays && monthdays.length > 0 ? [...monthdays] : null,
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
    closed_at: null,
    trashed_at: null,
  }
}

interface Props {
  objectId: string
  onClose: () => void
}

export default function ObjectModal({ objectId, onClose }: Props) {
  const {
    objects, schedules, closedSchedules, updateObject, deleteObject, closeObject,
    addSchedule, updateSchedule, deleteSchedule, closeSchedule, restoreClosedSchedule,
  } = useData()

  const obj = objects.find(o => o.id === objectId)
  const initialSchedulesRef = useRef<Schedule[]>([])
  const [draftSchedules, setDraftSchedules] = useState<Schedule[]>([])
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(obj?.title ?? '')
  const [closing, setClosing] = useState(false)
  const [closeReview, setCloseReview] = useState('')
  const [savingClose, setSavingClose] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [scheduleDirty, setScheduleDirty] = useState(false)
  const [savingSchedules, setSavingSchedules] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { setTitleValue(obj?.title ?? '') }, [obj?.title])
  useEffect(() => {
    if (!obj || scheduleDirty) return
    const base = cloneSchedules(
      schedules.filter(s => s.obj_id === objectId && s.closed_at === null && s.trashed_at === null),
    )
    initialSchedulesRef.current = base
    setDraftSchedules(base)
  }, [obj, objectId, schedules, scheduleDirty])

  const activeDraftSchedules = draftSchedules.filter(s => s.closed_at === null)
  const activeScheduleIds = new Set(activeDraftSchedules.map(s => s.id))
  const superSchedules = activeDraftSchedules
    .filter(s => s.parent_id === null || !activeScheduleIds.has(s.parent_id))
    .sort((a, b) => a.sort_order - b.sort_order)
  const closedObjectSchedules = closedSchedules
    .filter(schedule => schedule.obj_id === objectId && schedule.trashed_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  if (!obj) return null

  function getSubSchedules(superId: string) {
    return activeDraftSchedules
      .filter(s => s.parent_id === superId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function markDirty() {
    setScheduleDirty(true)
    setScheduleError(null)
  }

  async function commitTitle() {
    setTitleEditing(false)
    if (titleValue.trim() && titleValue.trim() !== obj!.title) {
      await updateObject(objectId, { title: titleValue.trim() })
    } else {
      setTitleValue(obj!.title)
    }
  }

  function handleSuperDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = superSchedules.findIndex(s => s.id === active.id)
    const newIndex = superSchedules.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const ordered = arrayMove(superSchedules, oldIndex, newIndex)
    setDraftSchedules(prev => {
      const orderMap = new Map(ordered.map((schedule, index) => [schedule.id, index]))
      return prev.map(schedule =>
        orderMap.has(schedule.id)
          ? { ...schedule, sort_order: orderMap.get(schedule.id)! }
          : schedule
      )
    })
    markDirty()
  }

  function handleSubDragEnd(superId: string, event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const subs = getSubSchedules(superId)
    const oldIndex = subs.findIndex(s => s.id === active.id)
    const newIndex = subs.findIndex(s => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const ordered = arrayMove(subs, oldIndex, newIndex)
    setDraftSchedules(prev => {
      const orderMap = new Map(ordered.map((schedule, index) => [schedule.id, index]))
      return prev.map(schedule =>
        orderMap.has(schedule.id)
          ? { ...schedule, sort_order: orderMap.get(schedule.id)! }
          : schedule
      )
    })
    markDirty()
  }

  function handleAddSuper(
    title: string,
    intvl: Interval,
    start_date: string,
    scheduleMode: ScheduleMode = 'specific',
    weekdays?: number[],
    monthdays?: number[],
    end_date?: string
  ) {
    const sortOrder = superSchedules.length > 0
      ? Math.max(...superSchedules.map(s => s.sort_order)) + 1
      : 0
    setDraftSchedules(prev => [
      ...prev,
      createTempSchedule(objectId, title, intvl, start_date, scheduleMode, null, sortOrder, weekdays, monthdays, end_date),
    ])
    markDirty()
  }

  function handleAddSub(
    superId: string,
    title: string,
    intvl: Interval,
    start_date: string,
    scheduleMode: ScheduleMode = 'specific',
    weekdays?: number[],
    monthdays?: number[],
    end_date?: string
  ) {
    const subs = getSubSchedules(superId)
    const sortOrder = subs.length > 0 ? Math.max(...subs.map(s => s.sort_order)) + 1 : 0
    setDraftSchedules(prev => [
      ...prev,
      createTempSchedule(objectId, title, intvl, start_date, scheduleMode, superId, sortOrder, weekdays, monthdays, end_date),
    ])
    markDirty()
  }

  function handleUpdateSchedule(id: string, patch: Partial<Schedule>) {
    setDraftSchedules(prev => prev.map(schedule => {
      if (schedule.id !== id) return schedule
      const next: Schedule = {
        ...schedule,
        ...patch,
      }
      if ('weekdays' in patch) next.weekdays = patch.weekdays ? [...patch.weekdays] : patch.weekdays ?? null
      if ('monthdays' in patch) next.monthdays = patch.monthdays ? [...patch.monthdays] : patch.monthdays ?? null
      return next
    }))
    markDirty()
  }

  function handleDeleteSchedule(id: string) {
    setDraftSchedules(prev => prev.filter(schedule => schedule.id !== id && schedule.parent_id !== id))
    markDirty()
  }

  function handleCloseSchedule(id: string) {
    setDraftSchedules(prev => {
      const target = prev.find(schedule => schedule.id === id)
      if (target && isTempSchedule(target)) {
        return prev.filter(schedule => schedule.id !== id && schedule.parent_id !== id)
      }
      return prev.map(schedule => (
        schedule.id === id
          ? { ...schedule, closed_at: new Date().toISOString() }
          : schedule
      ))
    })
    markDirty()
  }

  async function handleSaveSchedules() {
    if (!scheduleDirty) {
      onClose()
      return
    }

    setSavingSchedules(true)
    setScheduleError(null)

    try {
      const initialSchedules = initialSchedulesRef.current
      const initialById = new Map(initialSchedules.map(schedule => [schedule.id, schedule]))
      const draftById = new Map(draftSchedules.map(schedule => [schedule.id, schedule]))
      const tempIdMap = new Map<string, string>()

      const toUpdate = draftSchedules.filter(schedule => !isTempSchedule(schedule))
      for (const schedule of toUpdate) {
        const original = initialById.get(schedule.id)
        if (!original) continue
        const patch = buildSchedulePatch(schedule, original)
        if (Object.keys(patch).length > 0) {
          const updated = await updateSchedule(schedule.id, patch)
          if (!updated) throw new Error(`failed to update ${schedule.id}`)
        }
        if (schedule.closed_at !== null && original.closed_at === null) {
          const closed = await closeSchedule(schedule.id)
          if (!closed) throw new Error(`failed to close ${schedule.id}`)
        }
      }

      const tempDrafts = draftSchedules
        .filter(schedule => isTempSchedule(schedule) && schedule.closed_at === null)
        .sort((a, b) => a.sort_order - b.sort_order)
      const rootTemps = tempDrafts
        .filter(schedule => !schedule.parent_id || initialById.has(schedule.parent_id))
        .sort((a, b) => a.sort_order - b.sort_order)
      const childTemps = tempDrafts
        .filter(schedule => schedule.parent_id && !initialById.has(schedule.parent_id))
        .sort((a, b) => a.sort_order - b.sort_order)

      for (const schedule of rootTemps) {
        const parentId = schedule.parent_id && !initialById.has(schedule.parent_id)
          ? tempIdMap.get(schedule.parent_id)
          : schedule.parent_id
        const created = await addSchedule(
          objectId,
          schedule.title,
          schedule.intvl,
          schedule.start_date,
          schedule.schedule_mode ?? 'specific',
          parentId ?? undefined,
          schedule.weekdays ?? undefined,
          schedule.monthdays ?? undefined,
          schedule.end_date ?? undefined,
        )
        if (!created) throw new Error(`failed to add ${schedule.id}`)
        tempIdMap.set(schedule.id, created.id)
      }

      for (const schedule of childTemps) {
        const parentId = schedule.parent_id ? tempIdMap.get(schedule.parent_id) : undefined
        if (!parentId) throw new Error(`missing parent for ${schedule.id}`)
        const created = await addSchedule(
          objectId,
          schedule.title,
          schedule.intvl,
          schedule.start_date,
          schedule.schedule_mode ?? 'specific',
          parentId,
          schedule.weekdays ?? undefined,
          schedule.monthdays ?? undefined,
          schedule.end_date ?? undefined,
        )
        if (!created) throw new Error(`failed to add ${schedule.id}`)
        tempIdMap.set(schedule.id, created.id)
      }

      const deletedSchedules = initialSchedules
        .filter(schedule => !draftById.has(schedule.id))
        .sort((a, b) => (a.parent_id ? 0 : 1) - (b.parent_id ? 0 : 1))
      for (const schedule of deletedSchedules) {
        const deleted = await deleteSchedule(schedule.id)
        if (!deleted) throw new Error(`failed to delete ${schedule.id}`)
      }

      setScheduleDirty(false)
      onClose()
    } catch (error) {
      console.error('saveSchedules:', error)
      setScheduleError('스케줄 저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSavingSchedules(false)
    }
  }

  async function handleRestoreClosedSchedule(scheduleId: string) {
    const restored = await restoreClosedSchedule(scheduleId)
    if (!restored) {
      setScheduleError('마친 스케줄을 복원하지 못했습니다. 다시 시도해 주세요.')
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
                  <ScheduleItem
                    key={sup.id}
                    schedule={sup}
                    depth={0}
                    onUpdate={handleUpdateSchedule}
                    onDelete={handleDeleteSchedule}
                    onCloseSchedule={handleCloseSchedule}
                  >
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={e => handleSubDragEnd(sup.id, e)}
                    >
                      <SortableContext items={subs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {subs.map(sub => (
                          <ScheduleItem
                            key={sub.id}
                            schedule={sub}
                            depth={1}
                            onUpdate={handleUpdateSchedule}
                            onDelete={handleDeleteSchedule}
                            onCloseSchedule={handleCloseSchedule}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <AddScheduleRow
                      depth={1}
                      onAdd={(t, i, d, mode, w, m, e) => handleAddSub(sup.id, t, i, d, mode, w, m, e)}
                    />
                  </ScheduleItem>
                )
              })}
            </SortableContext>
          </DndContext>

          <AddScheduleRow onAdd={(t, i, d, mode, w, m, e) => handleAddSuper(t, i, d, mode, w, m, e)} />

          {closedObjectSchedules.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-400">마친 스케줄</p>
              <div className="space-y-2">
                {closedObjectSchedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-700">{schedule.title}</p>
                      <p className="text-xs text-gray-400">{formatScheduleLabel(schedule)}</p>
                    </div>
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

          {scheduleError && (
            <div className="px-6 pb-2 text-xs text-red-400">
              {scheduleError}
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
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={savingSchedules}
            >
              닫기
            </button>
            <button
              onClick={handleSaveSchedules}
              disabled={!scheduleDirty || savingSchedules}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium disabled:text-gray-300"
            >
              {savingSchedules ? '저장 중...' : '저장'}
            </button>
          </div>
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
  )
}
