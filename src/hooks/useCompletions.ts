import { useEffect, useState } from 'react'
import { isToday, startOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Completion } from '../types'
import { formatDate } from '../lib/dateUtils'
import { encodeNoteOnlyMemo, isNoteOnlyMemo } from '../lib/completionMemo'

export function useCompletions(scheduleIds: string[], year: number) {
  const { user } = useAuth()
  const [completions, setCompletions] = useState<Completion[]>([])

  useEffect(() => {
    if (!user || scheduleIds.length === 0) {
      setCompletions([])
      return
    }
    fetch()
  }, [user, scheduleIds.join(','), year])

  async function fetch() {
    const fromDate = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 0 })
    const toDate = endOfWeek(endOfYear(new Date(year, 0, 1)), { weekStartsOn: 0 })

    const { data } = await supabase
      .from('completions')
      .select('*')
      .in('schedule_id', scheduleIds)
      .gte('due_date', formatDate(fromDate))
      .lte('due_date', formatDate(toDate))
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
    const today = startOfDay(new Date())
    const targetDay = startOfDay(date)

    if (targetDay > today) return

    if (!isToday(date) && existing) {
      if (normalizedMemo === null && isNoteOnlyMemo(existing.memo)) {
        const { error } = await supabase.from('completions').delete().eq('id', existing.id)
        if (error) { console.error('saveCompletion:', error); return }
        setCompletions(prev => prev.filter(c => c.id !== existing.id))
        return
      }

      const nextMemo = normalizedMemo === null
        ? null
        : isNoteOnlyMemo(existing.memo)
          ? encodeNoteOnlyMemo(normalizedMemo)
          : normalizedMemo

      const { data, error } = await supabase
        .from('completions')
        .update({ memo: nextMemo })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) { console.error('saveCompletion:', error); return }
      if (data) setCompletions(prev => prev.map(c => c.id === existing.id ? data : c))
      return
    }

    if (!isToday(date) && normalizedMemo !== null) {
      const { data, error } = await supabase
        .from('completions')
        .insert({
          schedule_id: scheduleId,
          due_date: d,
          user_id: user!.id,
          memo: encodeNoteOnlyMemo(normalizedMemo),
        })
        .select()
        .single()
      if (error) { console.error('saveCompletion:', error); return }
      if (data) setCompletions(prev => [...prev, data])
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
