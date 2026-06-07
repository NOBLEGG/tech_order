import { useEffect, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useData } from '../../context/DataContext'
import ScheduleItem from './ScheduleItem'
import AddScheduleRow from './AddScheduleRow'
import ReferenceSection from './ReferenceSection'
import type { Interval } from '../../types'

interface Props {
  objectId: string
  onClose: () => void
}

export default function ObjectModal({ objectId, onClose }: Props) {
  const { objects, schedules, updateObject, deleteObject, addSchedule, updateSchedule, deleteSchedule, reorderSchedules } = useData()

  const obj = objects.find(o => o.id === objectId)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(obj?.title ?? '')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { setTitleValue(obj?.title ?? '') }, [obj?.title])

  if (!obj) return null

  const superSchedules = schedules
    .filter(s => s.obj_id === objectId && s.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  function getSubSchedules(superId: string) {
    return schedules
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

  function handleSuperDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = superSchedules.findIndex(s => s.id === active.id)
    const newIndex = superSchedules.findIndex(s => s.id === over.id)
    reorderSchedules(arrayMove(superSchedules, oldIndex, newIndex))
  }

  function handleSubDragEnd(superId: string, event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const subs = getSubSchedules(superId)
    const oldIndex = subs.findIndex(s => s.id === active.id)
    const newIndex = subs.findIndex(s => s.id === over.id)
    reorderSchedules(arrayMove(subs, oldIndex, newIndex))
  }

  function handleAddSuper(title: string, intvl: Interval, start_date: string, weekdays?: number[], monthdays?: number[]) {
    addSchedule(objectId, title, intvl, start_date, undefined, weekdays, monthdays)
  }

  function handleAddSub(superId: string, title: string, intvl: Interval, start_date: string, weekdays?: number[], monthdays?: number[]) {
    addSchedule(objectId, title, intvl, start_date, superId, weekdays, monthdays)
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
                    onUpdate={updateSchedule}
                    onDelete={deleteSchedule}
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
                            onUpdate={updateSchedule}
                            onDelete={deleteSchedule}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <AddScheduleRow depth={1} onAdd={(t, i, d, w, m) => handleAddSub(sup.id, t, i, d, w, m)} />
                  </ScheduleItem>
                )
              })}
            </SortableContext>
          </DndContext>

          <AddScheduleRow onAdd={(t, i, d, w, m) => handleAddSuper(t, i, d, w, m)} />
        </div>

        {/* footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={async () => { await deleteObject(objectId); onClose() }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            오브젝트 삭제
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
