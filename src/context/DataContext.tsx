import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { AppObject, Schedule, Interval } from '../types'

interface DataContextValue {
  objects: AppObject[]
  schedules: Schedule[]
  loading: boolean
  addObject: (title: string) => Promise<void>
  updateObject: (id: string, patch: Partial<AppObject>) => Promise<void>
  deleteObject: (id: string) => Promise<void>
  addSchedule: (
    obj_id: string, title: string, intvl: Interval, start_date: string,
    parent_id?: string, weekdays?: number[], monthdays?: number[]
  ) => Promise<void>
  updateSchedule: (id: string, patch: Partial<Schedule>) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
  reorderSchedules: (ordered: Schedule[]) => Promise<void>
}

const DataContext = createContext<DataContextValue>(null as any)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  async function fetchAll() {
    setLoading(true)
    const [{ data: objs }, { data: schs }] = await Promise.all([
      supabase.from('objects').select('*').order('sort_order'),
      supabase.from('schedules').select('*').order('sort_order'),
    ])
    setObjects(objs ?? [])
    setSchedules(schs ?? [])
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

  async function addSchedule(
    obj_id: string, title: string, intvl: Interval, start_date: string,
    parent_id?: string, weekdays?: number[], monthdays?: number[]
  ) {
    const siblings = schedules.filter(s =>
      s.obj_id === obj_id && (parent_id ? s.parent_id === parent_id : s.parent_id === null)
    )
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        obj_id, title, intvl, start_date,
        weekdays: weekdays ?? null,
        monthdays: monthdays ?? null,
        parent_id: parent_id ?? null,
        sort_order: maxOrder,
      })
      .select().single()
    if (error) { console.error('addSchedule:', error); return }
    if (data) setSchedules(prev => [...prev, data])
  }

  async function updateSchedule(id: string, patch: Partial<Schedule>) {
    if (patch.intvl) {
      await supabase.from('completions').delete().eq('schedule_id', id)
    }
    const { data, error } = await supabase.from('schedules').update(patch).eq('id', id).select().single()
    if (error) { console.error('updateSchedule:', error); return }
    if (data) setSchedules(prev => prev.map(s => s.id === id ? data : s))
  }

  async function deleteSchedule(id: string) {
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (error) { console.error('deleteSchedule:', error); return }
    setSchedules(prev => prev.filter(s => s.id !== id && s.parent_id !== id))
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
      objects, schedules, loading,
      addObject, updateObject, deleteObject,
      addSchedule, updateSchedule, deleteSchedule, reorderSchedules,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
