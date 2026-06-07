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
    const d = formatDate(date)
    return completions.some(c => c.schedule_id === scheduleId && c.due_date === d)
  }

  async function toggle(scheduleId: string, date: Date) {
    const d = formatDate(date)
    const existing = completions.find(c => c.schedule_id === scheduleId && c.due_date === d)

    if (existing) {
      await supabase.from('completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase
        .from('completions')
        .insert({ schedule_id: scheduleId, due_date: d, user_id: user!.id })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data])
    }
  }

  return { completions, isCompleted, toggle }
}
