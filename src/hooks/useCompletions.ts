import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Completion } from '../types'
import { formatDate } from '../lib/dateUtils'

export function useCompletions(scheduleIds: string[], year: number, month: number) {
  const { user } = useAuth()
  const [completions, setCompletions] = useState<Completion[]>([])

  useEffect(() => {
    if (!user || scheduleIds.length === 0) {
      setCompletions([])
      return
    }
    fetch()
  }, [user, scheduleIds.join(','), year, month])

  async function fetch() {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    const { data } = await supabase
      .from('completions')
      .select('*')
      .in('schedule_id', scheduleIds)
      .gte('due_date', from)
      .lte('due_date', to)
    setCompletions(data ?? [])
  }

  function isCompleted(scheduleId: string, date: Date): boolean {
    return !!getCompletion(scheduleId, date)
  }

  function getCompletion(scheduleId: string, date: Date): Completion | undefined {
    const d = formatDate(date)
    return completions.find(c => c.schedule_id === scheduleId && c.due_date === d)
  }

  async function saveCompletion(scheduleId: string, date: Date, memo: string) {
    const d = formatDate(date)
    const existing = getCompletion(scheduleId, date)
    const normalizedMemo = memo.trim() || null

    if (existing) {
      const { data, error } = await supabase
        .from('completions')
        .update({ memo: normalizedMemo })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) { console.error('saveCompletion:', error); return }
      if (data) setCompletions(prev => prev.map(c => c.id === existing.id ? data : c))
      return
    }

    const { data, error } = await supabase
      .from('completions')
      .insert({ schedule_id: scheduleId, due_date: d, user_id: user!.id, memo: normalizedMemo })
      .select()
      .single()
    if (error) { console.error('saveCompletion:', error); return }
    if (data) setCompletions(prev => [...prev, data])
  }

  async function deleteCompletion(id: string) {
    const { error } = await supabase.from('completions').delete().eq('id', id)
    if (error) { console.error('deleteCompletion:', error); return }
    setCompletions(prev => prev.filter(c => c.id !== id))
  }

  return { completions, getCompletion, isCompleted, saveCompletion, deleteCompletion }
}
