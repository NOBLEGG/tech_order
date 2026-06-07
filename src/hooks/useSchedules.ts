import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Schedule, Interval } from '../types'

export function useSchedules(objectIds: string[]) {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || objectIds.length === 0) {
      setSchedules([])
      setLoading(false)
      return
    }
    fetch()
  }, [user, objectIds.join(',')])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .in('obj_id', objectIds)
      .order('sort_order')
    setSchedules(data ?? [])
    setLoading(false)
  }

  async function addSchedule(obj_id: string, title: string, intvl: Interval, parent_id?: string) {
    const siblings = schedules.filter(s =>
      s.obj_id === obj_id && (parent_id ? s.parent_id === parent_id : s.parent_id === null)
    )
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0
    const { data } = await supabase
      .from('schedules')
      .insert({ obj_id, title, intvl, parent_id: parent_id ?? null, sort_order: maxOrder })
      .select()
      .single()
    if (data) setSchedules(prev => [...prev, data])
  }

  async function updateSchedule(id: string, patch: Partial<Schedule>) {
    const { data } = await supabase
      .from('schedules')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (data) setSchedules(prev => prev.map(s => s.id === id ? data : s))
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id && s.parent_id !== id))
  }

  async function reorderSchedules(ordered: Schedule[]) {
    setSchedules(prev => {
      const ids = new Set(ordered.map(s => s.id))
      return [...prev.filter(s => !ids.has(s.id)), ...ordered]
        .sort((a, b) => a.sort_order - b.sort_order)
    })
    await Promise.all(
      ordered.map((s, i) =>
        supabase.from('schedules').update({ sort_order: i }).eq('id', s.id)
      )
    )
  }

  return { schedules, loading, addSchedule, updateSchedule, deleteSchedule, reorderSchedules, refetch: fetch }
}
