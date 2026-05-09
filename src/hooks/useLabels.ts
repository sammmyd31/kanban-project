import { useEffect, useState } from 'react'
import { supabase, ensureGuestSession } from '../lib/supabase'
import type { Label, LabelColor } from '../lib/labels'

export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([])

  useEffect(() => {
    let cancelled = false
    ensureGuestSession().then(session => {
      if (!session || cancelled) return
      supabase
        .from('labels')
        .select('id, name, color')
        .eq('user_id', session.user.id)
        .order('created_at')
        .then(({ data }) => {
          if (!cancelled) setLabels((data as Label[]) ?? [])
        })
    })
    return () => { cancelled = true }
  }, [])

  async function createLabel(name: string, color: LabelColor): Promise<Label | null> {
    const session = await ensureGuestSession()
    if (!session) return null
    const { data, error } = await supabase
      .from('labels')
      .insert({ user_id: session.user.id, name, color })
      .select('id, name, color')
      .single()
    if (error || !data) return null
    const label = data as Label
    setLabels(prev => [...prev, label])
    return label
  }

  async function deleteLabel(id: string) {
    const { error } = await supabase.from('labels').delete().eq('id', id)
    if (!error) setLabels(prev => prev.filter(l => l.id !== id))
  }

  return { labels, createLabel, deleteLabel }
}
