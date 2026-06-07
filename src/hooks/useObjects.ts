import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AppObject } from '../types'

export function useObjects() {
  const { user } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch()
  }, [user])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('objects')
      .select('*')
      .order('sort_order')
    setObjects(data ?? [])
    setLoading(false)
  }

  async function addObject(title: string) {
    const maxOrder = objects.length > 0 ? Math.max(...objects.map(o => o.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('objects')
      .insert({ title, user_id: user!.id, sort_order: maxOrder })
      .select()
      .single()
    if (error) { console.error('addObject error:', error); return }
    if (data) setObjects(prev => [...prev, data])
  }

  async function updateObject(id: string, patch: Partial<AppObject>) {
    const { data } = await supabase
      .from('objects')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (data) setObjects(prev => prev.map(o => o.id === id ? data : o))
  }

  async function deleteObject(id: string) {
    await supabase.from('objects').delete().eq('id', id)
    setObjects(prev => prev.filter(o => o.id !== id))
  }

  return { objects, loading, addObject, updateObject, deleteObject, refetch: fetch }
}
