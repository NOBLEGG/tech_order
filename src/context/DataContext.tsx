import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type {
  AppObject,
  Schedule,
  Interval,
  ScheduleMode,
  ObjectClosureReview,
} from '../types'

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

interface DataContextValue {
  objects: AppObject[]
  closedObjects: AppObject[]
  trashedObjects: AppObject[]
  schedules: Schedule[]
  closedSchedules: Schedule[]
  trashedSchedules: Schedule[]
  objectClosureReviews: ObjectClosureReview[]
  loading: boolean
  addObject: (title: string) => Promise<void>
  updateObject: (id: string, patch: Partial<AppObject>) => Promise<void>
  deleteObject: (id: string) => Promise<boolean>
  trashObject: (id: string) => Promise<boolean>
  restoreClosedObject: (id: string) => Promise<boolean>
  restoreTrashedObject: (id: string) => Promise<boolean>
  purgeTrashedObject: (id: string) => Promise<boolean>
  closeObject: (id: string, review: string) => Promise<boolean>
  addSchedule: (
    obj_id: string, title: string, intvl: Interval, start_date: string,
    schedule_mode?: ScheduleMode, parent_id?: string, weekdays?: number[],
    monthdays?: number[], end_date?: string
  ) => Promise<Schedule | null>
  updateSchedule: (id: string, patch: Partial<Schedule>) => Promise<Schedule | null>
  deleteSchedule: (id: string) => Promise<boolean>
  trashSchedule: (id: string) => Promise<boolean>
  restoreClosedSchedule: (id: string) => Promise<boolean>
  restoreTrashedSchedule: (id: string) => Promise<boolean>
  purgeTrashedSchedule: (id: string) => Promise<boolean>
  closeSchedule: (id: string) => Promise<boolean>
  reorderSchedules: (ordered: Schedule[]) => Promise<void>
}

const DataContext = createContext<DataContextValue>(null as any)

function isExpiredTrash(value: string | null) {
  if (!value) return false
  return Date.now() - new Date(value).getTime() >= TRASH_RETENTION_MS
}

function collectScheduleTreeIds(allSchedules: Schedule[], rootId: string) {
  const ids = new Set<string>([rootId])
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue

    for (const schedule of allSchedules) {
      if (schedule.parent_id !== current || ids.has(schedule.id)) continue
      ids.add(schedule.id)
      queue.push(schedule.id)
    }
  }

  return [...ids]
}

function hasAncestorInSet(
  allSchedules: Schedule[],
  schedule: Schedule,
  candidateIds: Set<string>,
) {
  let currentParent = schedule.parent_id

  while (currentParent) {
    if (candidateIds.has(currentParent)) return true
    currentParent = allSchedules.find(item => item.id === currentParent)?.parent_id ?? null
  }

  return false
}

function sortBySortOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order)
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [closedObjects, setClosedObjects] = useState<AppObject[]>([])
  const [trashedObjects, setTrashedObjects] = useState<AppObject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [closedSchedules, setClosedSchedules] = useState<Schedule[]>([])
  const [trashedSchedules, setTrashedSchedules] = useState<Schedule[]>([])
  const [objectClosureReviews, setObjectClosureReviews] = useState<ObjectClosureReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  async function fetchAll() {
    if (!user) return

    setLoading(true)
    try {
      const [{ data: objRows }, { data: scheduleRows }, { data: reviewRows }] = await Promise.all([
        supabase.from('objects').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('object_closure_reviews').select('*').order('created_at', { ascending: false }),
      ])

      const allObjects = objRows ?? []
      const allSchedules = scheduleRows ?? []
      const allReviews = reviewRows ?? []

      const expiredTrashedObjects = allObjects.filter(obj => isExpiredTrash(obj.trashed_at))
      const purgedObjectIds = new Set<string>()
      const purgedScheduleIds = new Set<string>()

      for (const object of expiredTrashedObjects) {
        const scheduleIds = allSchedules
          .filter(schedule => schedule.obj_id === object.id)
          .map(schedule => schedule.id)
        if (scheduleIds.length > 0) {
          const { error: completionError } = await supabase
            .from('completions')
            .delete()
            .in('schedule_id', scheduleIds)
          if (completionError) {
            console.error('purgeExpiredTrash completions:', completionError)
            continue
          }
          const { error: scheduleError } = await supabase
            .from('schedules')
            .delete()
            .eq('obj_id', object.id)
          if (scheduleError) {
            console.error('purgeExpiredTrash schedules:', scheduleError)
            continue
          }
        }

        const { error: reviewError } = await supabase
          .from('object_closure_reviews')
          .delete()
          .eq('object_id', object.id)
        if (reviewError) {
          console.error('purgeExpiredTrash reviews:', reviewError)
          continue
        }

        const { error: objectError } = await supabase
          .from('objects')
          .delete()
          .eq('id', object.id)
        if (objectError) {
          console.error('purgeExpiredTrash object:', objectError)
          continue
        }

        purgedObjectIds.add(object.id)
        scheduleIds.forEach(id => purgedScheduleIds.add(id))
      }

      const expiredScheduleCandidates = allSchedules.filter(schedule => {
        if (!isExpiredTrash(schedule.trashed_at)) return false
        if (purgedObjectIds.has(schedule.obj_id)) return false
        return true
      })

      const expiredScheduleCandidateIds = new Set(expiredScheduleCandidates.map(schedule => schedule.id))
      const expiredTrashedSchedules = expiredScheduleCandidates.filter(schedule =>
        !hasAncestorInSet(allSchedules, schedule, expiredScheduleCandidateIds)
      )

      const expiredScheduleIds = new Set<string>()
      for (const schedule of expiredTrashedSchedules) {
        if (expiredScheduleIds.has(schedule.id)) continue
        const scheduleIds = collectScheduleTreeIds(allSchedules, schedule.id)
        const { error: completionError } = await supabase
          .from('completions')
          .delete()
          .in('schedule_id', scheduleIds)
        if (completionError) {
          console.error('purgeExpiredTrash completions:', completionError)
          continue
        }
        const { error: deleteError } = await supabase
          .from('schedules')
          .delete()
          .in('id', scheduleIds)
        if (deleteError) {
          console.error('purgeExpiredTrash schedules:', deleteError)
          continue
        }
        scheduleIds.forEach(id => {
          expiredScheduleIds.add(id)
          purgedScheduleIds.add(id)
        })
      }

      const filteredObjects = allObjects.filter(obj => !purgedObjectIds.has(obj.id))
      const filteredSchedules = allSchedules.filter(schedule => !purgedScheduleIds.has(schedule.id))
      const filteredReviews = allReviews.filter(review => !purgedObjectIds.has(review.object_id))

      const activeObjects = sortBySortOrder(
        filteredObjects.filter(obj => obj.closed_at === null && obj.trashed_at === null),
      )
      const closedObjectsList = sortBySortOrder(
        filteredObjects.filter(obj => obj.closed_at !== null && obj.trashed_at === null),
      ).sort((a, b) => {
        const left = a.closed_at ? new Date(a.closed_at).getTime() : 0
        const right = b.closed_at ? new Date(b.closed_at).getTime() : 0
        return right - left
      })
      const trashedObjectsList = sortBySortOrder(
        filteredObjects.filter(obj => obj.trashed_at !== null),
      ).sort((a, b) => {
        const left = a.trashed_at ? new Date(a.trashed_at).getTime() : 0
        const right = b.trashed_at ? new Date(b.trashed_at).getTime() : 0
        return right - left
      })

      const activeObjectIds = new Set(activeObjects.map(obj => obj.id))
      const activeSchedules = sortBySortOrder(
        filteredSchedules.filter(schedule =>
          schedule.closed_at === null &&
          schedule.trashed_at === null &&
          activeObjectIds.has(schedule.obj_id)
        ),
      )
      const closedSchedulesList = sortBySortOrder(
        filteredSchedules.filter(schedule =>
          schedule.closed_at !== null && schedule.trashed_at === null
        ),
      )
      const trashedSchedulesList = sortBySortOrder(
        filteredSchedules.filter(schedule => schedule.trashed_at !== null),
      ).sort((a, b) => {
        const left = a.trashed_at ? new Date(a.trashed_at).getTime() : 0
        const right = b.trashed_at ? new Date(b.trashed_at).getTime() : 0
        return right - left
      })

      setObjects(activeObjects)
      setClosedObjects(closedObjectsList)
      setTrashedObjects(trashedObjectsList)
      setSchedules(activeSchedules)
      setClosedSchedules(closedSchedulesList)
      setTrashedSchedules(trashedSchedulesList)
      setObjectClosureReviews(filteredReviews)
    } catch (error) {
      console.error('fetchAll:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addObject(title: string) {
    const maxOrder = objects.length > 0 ? Math.max(...objects.map(o => o.sort_order)) + 1 : 0
    const { error } = await supabase
      .from('objects')
      .insert({
        title,
        user_id: user!.id,
        sort_order: maxOrder,
        closed_at: null,
        trashed_at: null,
      })
    if (error) {
      console.error('addObject:', error)
      return
    }
    await fetchAll()
  }

  async function updateObject(id: string, patch: Partial<AppObject>) {
    const { error } = await supabase.from('objects').update(patch).eq('id', id)
    if (error) {
      console.error('updateObject:', error)
      return
    }
    await fetchAll()
  }

  async function closeObject(id: string, review: string) {
    const closedAt = new Date().toISOString()
    const { error: reviewError } = await supabase
      .from('object_closure_reviews')
      .upsert(
        { object_id: id, user_id: user!.id, review: review.trim() },
        { onConflict: 'object_id' }
      )
    if (reviewError) {
      console.error('closeObject review:', reviewError)
      return false
    }

    const { error } = await supabase
      .from('objects')
      .update({ closed_at: closedAt })
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) {
      console.error('closeObject:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function restoreClosedObject(id: string) {
    const { error } = await supabase.from('objects').update({ closed_at: null }).eq('id', id)
    if (error) {
      console.error('restoreClosedObject:', error)
      return false
    }

    const { error: reviewError } = await supabase
      .from('object_closure_reviews')
      .delete()
      .eq('object_id', id)
    if (reviewError) {
      console.error('restoreClosedObject review:', reviewError)
      return false
    }

    await fetchAll()
    return true
  }

  async function trashObject(id: string) {
    const now = new Date().toISOString()
    const { error: objectError } = await supabase
      .from('objects')
      .update({ trashed_at: now })
      .eq('id', id)
    if (objectError) {
      console.error('trashObject:', objectError)
      return false
    }

    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({ trashed_at: now })
      .eq('obj_id', id)
    if (scheduleError) {
      console.error('trashObject schedules:', scheduleError)
      return false
    }

    await fetchAll()
    return true
  }

  async function restoreTrashedObject(id: string) {
    const { error: objectError } = await supabase
      .from('objects')
      .update({ trashed_at: null })
      .eq('id', id)
    if (objectError) {
      console.error('restoreTrashedObject:', objectError)
      return false
    }

    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({ trashed_at: null })
      .eq('obj_id', id)
    if (scheduleError) {
      console.error('restoreTrashedObject schedules:', scheduleError)
      return false
    }

    await fetchAll()
    return true
  }

  async function purgeTrashedObject(id: string) {
    const scheduleIds = [
      ...schedules.filter(schedule => schedule.obj_id === id).map(schedule => schedule.id),
      ...closedSchedules.filter(schedule => schedule.obj_id === id).map(schedule => schedule.id),
      ...trashedSchedules.filter(schedule => schedule.obj_id === id).map(schedule => schedule.id),
    ]

    if (scheduleIds.length > 0) {
      const { error: completionError } = await supabase
        .from('completions')
        .delete()
        .in('schedule_id', scheduleIds)
      if (completionError) {
        console.error('purgeTrashedObject completions:', completionError)
        return false
      }
      const { error: scheduleError } = await supabase
        .from('schedules')
        .delete()
        .eq('obj_id', id)
      if (scheduleError) {
        console.error('purgeTrashedObject schedules:', scheduleError)
        return false
      }
    }

    const { error: reviewError } = await supabase
      .from('object_closure_reviews')
      .delete()
      .eq('object_id', id)
    if (reviewError) {
      console.error('purgeTrashedObject review:', reviewError)
      return false
    }

    const { error: objectError } = await supabase
      .from('objects')
      .delete()
      .eq('id', id)
    if (objectError) {
      console.error('purgeTrashedObject:', objectError)
      return false
    }

    await fetchAll()
    return true
  }

  async function addSchedule(
    obj_id: string, title: string, intvl: Interval, start_date: string,
    schedule_mode: ScheduleMode = 'specific',
    parent_id?: string, weekdays?: number[], monthdays?: number[], end_date?: string
  ): Promise<Schedule | null> {
    const siblings = schedules.filter(s =>
      s.obj_id === obj_id && (parent_id ? s.parent_id === parent_id : s.parent_id === null)
    )
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        obj_id,
        title,
        intvl,
        start_date,
        schedule_mode,
        end_date: end_date ?? null,
        weekdays: weekdays ?? null,
        monthdays: monthdays ?? null,
        parent_id: parent_id ?? null,
        sort_order: maxOrder,
        closed_at: null,
        trashed_at: null,
      })
      .select()
      .single()
    if (error) {
      console.error('addSchedule:', error)
      return null
    }
    await fetchAll()
    return data ?? null
  }

  async function updateSchedule(id: string, patch: Partial<Schedule>): Promise<Schedule | null> {
    if (patch.intvl) {
      await supabase.from('completions').delete().eq('schedule_id', id)
    }
    const { data, error } = await supabase.from('schedules').update(patch).eq('id', id).select().single()
    if (error) {
      console.error('updateSchedule:', error)
      return null
    }
    await fetchAll()
    return data ?? null
  }

  async function trashSchedule(id: string): Promise<boolean> {
    const allSchedules = [...schedules, ...closedSchedules, ...trashedSchedules]
    const ids = collectScheduleTreeIds(allSchedules, id)
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('schedules')
      .update({ trashed_at: now })
      .in('id', ids)
    if (error) {
      console.error('trashSchedule:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function restoreTrashedSchedule(id: string): Promise<boolean> {
    const allSchedules = [...schedules, ...closedSchedules, ...trashedSchedules]
    const ids = collectScheduleTreeIds(allSchedules, id)

    const { error } = await supabase
      .from('schedules')
      .update({ trashed_at: null })
      .in('id', ids)
    if (error) {
      console.error('restoreTrashedSchedule:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function purgeTrashedSchedule(id: string): Promise<boolean> {
    const allSchedules = [...schedules, ...closedSchedules, ...trashedSchedules]
    const ids = collectScheduleTreeIds(allSchedules, id)

    const { error: completionError } = await supabase
      .from('completions')
      .delete()
      .in('schedule_id', ids)
    if (completionError) {
      console.error('purgeTrashedSchedule completions:', completionError)
      return false
    }

    const { error } = await supabase
      .from('schedules')
      .delete()
      .in('id', ids)
    if (error) {
      console.error('purgeTrashedSchedule:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function restoreClosedSchedule(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('schedules')
      .update({ closed_at: null })
      .eq('id', id)
    if (error) {
      console.error('restoreClosedSchedule:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function closeSchedule(id: string): Promise<boolean> {
    const closedAt = new Date().toISOString()
    const { error } = await supabase
      .from('schedules')
      .update({ closed_at: closedAt })
      .eq('id', id)
    if (error) {
      console.error('closeSchedule:', error)
      return false
    }

    await fetchAll()
    return true
  }

  async function reorderSchedules(ordered: Schedule[]) {
    const updated = ordered.map((s, i) => ({ ...s, sort_order: i }))
    await Promise.all(updated.map(s =>
      supabase.from('schedules').update({ sort_order: s.sort_order }).eq('id', s.id)
    ))
    await fetchAll()
  }

  async function deleteObject(id: string) {
    return trashObject(id)
  }

  async function deleteSchedule(id: string) {
    return trashSchedule(id)
  }

  return (
    <DataContext.Provider value={{
      objects,
      closedObjects,
      trashedObjects,
      schedules,
      closedSchedules,
      trashedSchedules,
      objectClosureReviews,
      loading,
      addObject,
      updateObject,
      deleteObject,
      trashObject,
      restoreClosedObject,
      restoreTrashedObject,
      purgeTrashedObject,
      closeObject,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      trashSchedule,
      restoreClosedSchedule,
      restoreTrashedSchedule,
      purgeTrashedSchedule,
      closeSchedule,
      reorderSchedules,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
