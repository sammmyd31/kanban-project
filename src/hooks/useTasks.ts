import { useEffect, useState } from 'react'
import { supabase, ensureGuestSession } from '../lib/supabase'
import type { Card } from '../components/KanbanCard'

export type ColumnStatus = 'todo' | 'in_progress' | 'in_review' | 'done'

export type BoardColumn = {
  title: string
  status: ColumnStatus
  accent: string
  tint: string
  cards: Card[]
}

export const COLUMN_DEFS: Omit<BoardColumn, 'cards'>[] = [
  { title: 'To Do',       status: 'todo',        accent: 'bg-red-300 dark:bg-red-500',    tint: 'bg-red-50/80 border-red-100 dark:bg-red-950/20 dark:border-red-900/40' },
  { title: 'In Progress', status: 'in_progress',  accent: 'bg-yellow-300 dark:bg-yellow-500', tint: 'bg-yellow-50/80 border-yellow-100 dark:bg-amber-950/20 dark:border-amber-900/40' },
  { title: 'In Review',   status: 'in_review',    accent: 'bg-blue-300 dark:bg-blue-500',   tint: 'bg-blue-50/80 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40' },
  { title: 'Done',        status: 'done',         accent: 'bg-green-300 dark:bg-green-500',  tint: 'bg-green-50/80 border-green-100 dark:bg-green-950/20 dark:border-green-900/40' },
]

const TITLE_TO_STATUS = Object.fromEntries(
  COLUMN_DEFS.map(d => [d.title, d.status])
) as Record<string, ColumnStatus>

type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: Card['priority'] | null
  due_date: string | null
  status: ColumnStatus
  position: number
  task_labels: { label_id: string }[]
}

type ActivityInsert = {
  task_id: string
  user_id: string
  action_type: string
  metadata: Record<string, string | null> | null
}

function rowToCard(row: TaskRow): Card {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority ?? undefined,
    due_date: row.due_date ? new Date(row.due_date + 'T00:00:00') : undefined,
    label_ids: row.task_labels?.map(tl => tl.label_id) ?? [],
  }
}

function dueDateForDB(d: Date | undefined): string | null {
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diffActivity(oldCard: Card, newCard: Card): Omit<ActivityInsert, 'task_id' | 'user_id'>[] {
  const entries: Omit<ActivityInsert, 'task_id' | 'user_id'>[] = []

  if (oldCard.title !== newCard.title)
    entries.push({ action_type: 'title_updated', metadata: null })

  if ((oldCard.description ?? '') !== (newCard.description ?? ''))
    entries.push({ action_type: 'description_updated', metadata: null })

  if (oldCard.priority !== newCard.priority)
    entries.push({ action_type: 'priority_changed', metadata: { from: oldCard.priority ?? null, to: newCard.priority ?? null } })

  const oldDate = dueDateForDB(oldCard.due_date)
  const newDate = dueDateForDB(newCard.due_date)
  if (oldDate !== newDate)
    entries.push({ action_type: 'due_date_changed', metadata: { from: oldDate, to: newDate } })

  const oldLabels = [...(oldCard.label_ids ?? [])].sort().join(',')
  const newLabels = [...(newCard.label_ids ?? [])].sort().join(',')
  if (oldLabels !== newLabels)
    entries.push({ action_type: 'labels_updated', metadata: null })

  return entries
}

export function useTasks() {
  const [columns, setColumns] = useState<BoardColumn[]>(
    COLUMN_DEFS.map(def => ({ ...def, cards: [] }))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityVersion, setLastMoveAt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const session = await ensureGuestSession()
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*, task_labels(label_id)')
          .eq('user_id', session!.user.id)
          .order('position')

        if (fetchError) throw fetchError
        if (cancelled) return

        setColumns(
          COLUMN_DEFS.map(def => ({
            ...def,
            cards: (data as TaskRow[] ?? [])
              .filter(r => r.status === def.status)
              .map(rowToCard),
          }))
        )
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load tasks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function addCard(columnTitle: string, card: Card) {
    const tempId = `temp-${Date.now()}`
    const tempCard: Card = { ...card, id: tempId }

    setColumns(prev =>
      prev.map(c => c.title === columnTitle ? { ...c, cards: [...c.cards, tempCard] } : c)
    )

    try {
      const status = TITLE_TO_STATUS[columnTitle]
      const session = await ensureGuestSession()
      const position = columns.find(c => c.title === columnTitle)?.cards.length ?? 0

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: session!.user.id,
          title: card.title,
          description: card.description ?? null,
          priority: card.priority ?? 'Medium',
          due_date: dueDateForDB(card.due_date),
          status,
          position,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const realCard = rowToCard(data as TaskRow)

      setColumns(prev =>
        prev.map(c =>
          c.title === columnTitle
            ? { ...c, cards: c.cards.map(existing => existing.id === tempId ? realCard : existing) }
            : c
        )
      )

      if (card.label_ids?.length) {
        await supabase.from('task_labels').insert(
          card.label_ids.map(label_id => ({ task_id: realCard.id!, label_id }))
        )
      }

      await supabase.from('activity_log').insert({
        task_id: realCard.id,
        user_id: session!.user.id,
        action_type: 'created',
        metadata: null,
      })
      setLastMoveAt(Date.now())
    } catch (e: unknown) {
      setColumns(prev =>
        prev.map(c =>
          c.title === columnTitle ? { ...c, cards: c.cards.filter(existing => existing.id !== tempId) } : c
        )
      )
      setError((e as Error).message ?? 'Failed to add task')
    }
  }

  async function editCard(columnTitle: string, updatedCard: Card) {
    const oldCard = columns.find(c => c.title === columnTitle)?.cards.find(c => c.id === updatedCard.id)

    setColumns(prev =>
      prev.map(c =>
        c.title === columnTitle
          ? { ...c, cards: c.cards.map(card => card.id === updatedCard.id ? updatedCard : card) }
          : c
      )
    )

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        title: updatedCard.title,
        description: updatedCard.description ?? null,
        priority: updatedCard.priority ?? 'Medium',
        due_date: dueDateForDB(updatedCard.due_date),
      })
      .eq('id', updatedCard.id)

    if (updateError) {
      if (oldCard) {
        setColumns(prev =>
          prev.map(c =>
            c.title === columnTitle
              ? { ...c, cards: c.cards.map(card => card.id === oldCard.id ? oldCard : card) }
              : c
          )
        )
      }
      setError(updateError.message ?? 'Failed to update task')
      return
    }

    await supabase.from('task_labels').delete().eq('task_id', updatedCard.id!)
    if (updatedCard.label_ids?.length) {
      await supabase.from('task_labels').insert(
        updatedCard.label_ids.map(label_id => ({ task_id: updatedCard.id!, label_id }))
      )
    }

    if (oldCard) {
      const entries = diffActivity(oldCard, updatedCard)
      if (entries.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('activity_log').insert(
            entries.map(e => ({
              task_id: updatedCard.id!,
              user_id: session.user.id,
              ...e,
            }))
          )
        }
      }
    }
  }

  async function deleteCard(columnTitle: string, cardId: string) {
    const col = columns.find(c => c.title === columnTitle)
    const cardIndex = col?.cards.findIndex(c => c.id === cardId) ?? -1
    const removedCard = col?.cards[cardIndex]

    setColumns(prev =>
      prev.map(c =>
        c.title === columnTitle ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c
      )
    )

    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', cardId)

    if (deleteError) {
      if (removedCard && cardIndex !== -1) {
        setColumns(prev =>
          prev.map(c => {
            if (c.title !== columnTitle) return c
            const cards = [...c.cards]
            cards.splice(cardIndex, 0, removedCard)
            return { ...c, cards }
          })
        )
      }
      setError(deleteError.message ?? 'Failed to delete task')
    }
  }

  function moveCard(
    cardId: string,
    sourceTitle: string,
    targetTitle: string,
    targetIndex: number
  ) {
    let movedCard: Card | undefined
    let originalIndex = -1

    setColumns(prev => {
      const removed = prev.map(col => {
        if (col.title !== sourceTitle) return col
        const remaining = col.cards.filter((c, i) => {
          if (c.id === cardId) { movedCard = c; originalIndex = i; return false }
          return true
        })
        return { ...col, cards: remaining }
      })

      if (!movedCard) return prev

      return removed.map(col => {
        if (col.title !== targetTitle) return col
        let insertIndex = targetIndex
        if (sourceTitle === targetTitle && originalIndex < targetIndex) insertIndex = targetIndex - 1
        const cards = [...col.cards]
        cards.splice(Math.min(Math.max(insertIndex, 0), cards.length), 0, movedCard!)
        return { ...col, cards }
      })
    })

    const targetStatus = TITLE_TO_STATUS[targetTitle]

    supabase
      .from('tasks')
      .update({ status: targetStatus, position: targetIndex })
      .eq('id', cardId)
      .then(({ error: moveError }) => {
        if (moveError) console.error('Failed to persist move:', moveError)
      })

    if (sourceTitle !== targetTitle) {
      ensureGuestSession()
        .then(session => supabase.from('activity_log').insert({
          task_id: cardId,
          user_id: session!.user.id,
          action_type: 'status_changed',
          metadata: { from: sourceTitle, to: targetTitle },
        }))
        .then(({ error: logError }) => {
          if (logError) console.error('Failed to log move:', logError)
          else setLastMoveAt(Date.now())
        })
        .catch(err => console.error('Failed to log move:', err))
    }
  }

  return { columns, loading, error, activityVersion, addCard, editCard, deleteCard, moveCard }
}
