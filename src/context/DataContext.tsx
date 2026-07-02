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

interface DataContextValue {
  objects: AppObject[]
  closedObjects: AppObject[]
  schedules: Schedule[]
  objectClosureReviews: ObjectClosureReview[]
  loading: boolean
  addObject: (title: string) => Promise<void>
  updateObject: (id: string, patch: Partial<AppObject>) => Promise<void>
  deleteObject: (id: string) => Promise<void>
  closeObject: (id: string, review: string) => Promise<boolean>
  deleteClosedObject: (id: string) => Promise<boolean>
  addSchedule: (
    obj_id: string, title: string, intvl: Interval, start_date: string,
    schedule_mode?: ScheduleMode, parent_id?: string, weekdays?: number[],
    monthdays?: number[], end_date?: string
  ) => Promise<Schedule | null>
  updateSchedule: (id: string, patch: Partial<Schedule>) => Promise<Schedule | null>
  deleteSchedule: (id: string) => Promise<boolean>
  closeSchedule: (id: string) => Promise<boolean>
  reorderSchedules: (ordered: Schedule[]) => Promise<void>
}

const DataContext = createContext<DataContextValue>(null as any)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [closedObjects, setClosedObjects] = useState<AppObject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [objectClosureReviews, setObjectClosureReviews] = useState<ObjectClosureReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  async function fetchAll() {
    setLoading(true)
    const [{ data: objs }, { data: schs }, { data: closedObjs }, { data: reviews }] = await Promise.all([
      supabase.from('objects').select('*').is('closed_at', null).order('sort_order'),
      supabase.from('schedules').select('*').is('closed_at', null).order('sort_order'),
      supabase.from('objects').select('*').not('closed_at', 'is', null).order('closed_at', { ascending: false }),
      supabase.from('object_closure_reviews').select('*').order('created_at', { ascending: false }),
    ])
    setObjects(objs ?? [])
    setClosedObjects(closedObjs ?? [])
    setObjectClosureReviews(reviews ?? [])
    const activeObjectIds = new Set((objs ?? []).map(o => o.id))
    setSchedules((schs ?? []).filter(s => activeObjectIds.has(s.obj_id)))
    setLoading(false)
  }

  async function addObject(title: string) {
    const maxOrder = objects.length > 0 ? Math.max(...objects.map(o => o.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('objects')
      .insert({ title, user_id: user!.id, sort_order: maxOrder })
      .select().single()
    if (error) { console.error('addObject:', error); return }
    if (data) setObjects(prev => [...prev, data])
  }

  async function updateObject(id: string, patch: Partial<AppObject>) {
    const { data, error } = await supabase.from('objects').update(patch).eq('id', id).select().single()
    if (error) { console.error('updateObject:', error); return }
    if (data) setObjects(prev => prev.map(o => o.id === id ? data : o))
  }

  async function deleteObject(id: string) {
    const { error } = await supabase.from('objects').delete().eq('id', id)
    if (error) { console.error('deleteObject:', error); return }
    setObjects(prev => prev.filter(o => o.id !== id))
    setSchedules(prev => prev.filter(s => s.obj_id !== id))
  }

  async function closeObject(id: string, review: string) {
    const obj = objects.find(o => o.id === id)
    if (!obj) return false

    const closedAt = new Date().toISOString()
    const { data: reviewData, error: reviewError } = await supabase
      .from('object_closure_reviews')
      .upsert(
        { object_id: id, user_id: user!.id, review: review.trim() },
        { onConflict: 'object_id' }
      )
      .select()
      .single()
    if (reviewError) {
      console.error('closeObject review:', reviewError)
      return false
    }

    const { error } = await supabase
      .from('objects')
      .update({ closed_at: closedAt })
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) { console.error('closeObject:', error); return false }

    const closedObject = { ...obj, closed_at: closedAt }
    setObjects(prev => prev.filter(o => o.id !== id))
    setClosedObjects(prev => [closedObject, ...prev])
    setSchedules(prev => prev.filter(s => s.obj_id !== id))
    if (reviewData) {
      setObjectClosureReviews(prev => [
        reviewData,
        ...prev.filter(r => r.object_id !== id),
      ])
    }
    return true
  }

  async function deleteClosedObject(id: string) {
    const { error } = await supabase.from('objects').delete().eq('id', id)
    if (error) {
      console.error('deleteClosedObject:', error)
      return false
    }

    setClosedObjects(prev => prev.filter(o => o.id !== id))
    setObjectClosureReviews(prev => prev.filter(r => r.object_id !== id))
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
        obj_id, title, intvl, start_date,
        schedule_mode,
        end_date: end_date ?? null,
        weekdays: weekdays ?? null,
        monthdays: monthdays ?? null,
        parent_id: parent_id ?? null,
        sort_order: maxOrder,
      })
      .select().single()
    if (error) { console.error('addSchedule:', error); return null }
    if (data) setSchedules(prev => [...prev, data])
    return data ?? null
  }

  async function updateSchedule(id: string, patch: Partial<Schedule>): Promise<Schedule | null> {
    if (patch.intvl) {
      await supabase.from('completions').delete().eq('schedule_id', id)
    }
    const { data, error } = await supabase.from('schedules').update(patch).eq('id', id).select().single()
    if (error) { console.error('updateSchedule:', error); return null }
    if (data) setSchedules(prev => prev.map(s => s.id === id ? data : s))
    return data ?? null
  }

  async function deleteSchedule(id: string): Promise<boolean> {
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (error) { console.error('deleteSchedule:', error); return false }
    setSchedules(prev => prev.filter(s => s.id !== id && s.parent_id !== id))
    return true
  }

  async function closeSchedule(id: string): Promise<boolean> {
    const closedAt = new Date().toISOString()
    const { error } = await supabase.from('schedules').update({ closed_at: closedAt }).eq('id', id)
    if (error) { console.error('closeSchedule:', error); return false }
    setSchedules(prev => prev.filter(s => s.id !== id))
    return true
  }

  async function reorderSchedules(ordered: Schedule[]) {
    const updated = ordered.map((s, i) => ({ ...s, sort_order: i }))
    setSchedules(prev => {
      const ids = new Set(updated.map(s => s.id))
      return [...prev.filter(s => !ids.has(s.id)), ...updated]
        .sort((a, b) => a.sort_order - b.sort_order)
    })
    await Promise.all(updated.map(s =>
      supabase.from('schedules').update({ sort_order: s.sort_order }).eq('id', s.id)
    ))
  }

  return (
    <DataContext.Provider value={{
      objects, closedObjects, schedules, objectClosureReviews, loading,
      addObject, updateObject, deleteObject, closeObject, deleteClosedObject,
      addSchedule, updateSchedule, deleteSchedule, closeSchedule, reorderSchedules,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
