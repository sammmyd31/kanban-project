import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiMinus, FiPlus, FiSend, FiTrash2, FiX } from 'react-icons/fi'
import { LuCalendarDays } from 'react-icons/lu'
import { supabase, ensureGuestSession } from '../lib/supabase'
import LabelPicker from './LabelPicker'
import type { Card, Priority } from './KanbanCard'
import type { Label, LabelColor } from '../lib/labels'
import { LABEL_PALETTE } from '../lib/labels'

interface TaskDetailModalProps {
  card: Card | null
  columnTitle: string
  activityVersion: number
  onClose: () => void
  onSave: (card: Card) => Promise<void> | void
  onDelete: (cardId: string) => void
  labels: Label[]
  onCreateLabel: (name: string, color: LabelColor) => Promise<Label | null>
  onDeleteLabel: (id: string) => void
}

type ActivityEntry = {
  id: string
  action_type: string
  metadata: { from?: string | null; to?: string | null } | null
  created_at: string
}

type CommentEntry = {
  id: string
  body: string
  created_at: string
}

const PRIORITY_CYCLE: Priority[] = ['Low', 'Medium', 'High']

const PRIORITY_CONFIG: Record<Priority, { badge: string; icon: React.ReactNode; label: string }> = {
  Low:    { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: <FiChevronDown className="h-3.5 w-3.5" />, label: 'Low' },
  Medium: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',         icon: <FiMinus className="h-3.5 w-3.5" />,       label: 'Medium' },
  High:   { badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',                 icon: <FiChevronUp className="h-3.5 w-3.5" />,   label: 'High' },
}

function cardToForm(card: Card) {
  const d = card.due_date
  return {
    title: card.title,
    description: card.description ?? '',
    priority: card.priority ?? ('Medium' as Priority),
    due_date: d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : '',
    label_ids: card.label_ids ?? [],
  }
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function formatLogDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' })
}

function entryLabel(entry: ActivityEntry): string {
  const { action_type: type, metadata: m } = entry
  switch (type) {
    case 'created':             return 'Task created'
    case 'title_updated':       return 'Title updated'
    case 'description_updated': return 'Description updated'
    case 'priority_changed':    return `Priority changed ${m?.from} → ${m?.to}`
    case 'due_date_changed':
      if (!m?.from) return `Due date set to ${formatLogDate(m?.to)}`
      if (!m?.to)   return 'Due date removed'
      return `Due date changed ${formatLogDate(m?.from)} → ${formatLogDate(m?.to)}`
    case 'labels_updated':       return 'Labels updated'
    case 'status_changed':      return `Moved ${m?.from} → ${m?.to}`
    default:                    return type
  }
}

export default function TaskDetailModal({ card, columnTitle, activityVersion, onClose, onSave, onDelete, labels, onCreateLabel, onDeleteLabel }: TaskDetailModalProps) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' as Priority, due_date: '', label_ids: [] as string[] })
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'activity' | 'comments'>('activity')
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (card) {
      setForm(cardToForm(card))
      setTitleError(false)
      setTab('activity')
      setCommentBody('')
      setLabelPickerOpen(false)
      requestAnimationFrame(() => {
        if (titleRef.current) autoResize(titleRef.current)
      })
    }
  }, [card])

  useEffect(() => {
    if (!card?.id) { setActivity([]); return }
    let cancelled = false
    setActivityLoading(true)

    supabase
      .from('activity_log')
      .select('id, action_type, metadata, created_at')
      .eq('task_id', card.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setActivity((data as ActivityEntry[]) ?? [])
          setActivityLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [card?.id, activityVersion])

  useEffect(() => {
    if (!card?.id) { setComments([]); return }
    let cancelled = false
    setCommentsLoading(true)

    supabase
      .from('comments')
      .select('id, body, created_at')
      .eq('task_id', card.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setComments((data as CommentEntry[]) ?? [])
          setCommentsLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [card?.id])

  if (!card) return null

  const handleSave = async () => {
    if (!form.title.trim()) { setTitleError(true); return }
    setSaving(true)
    await onSave({
      ...card,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      due_date: form.due_date ? new Date(form.due_date + 'T00:00:00') : undefined,
      label_ids: form.label_ids,
    })
    setSaving(false)
    onClose()
  }

  const handleAddComment = async () => {
    const body = commentBody.trim()
    if (!body || submitting) return
    setSubmitting(true)

    const tempId = `temp-${Date.now()}`
    const tempComment: CommentEntry = { id: tempId, body, created_at: new Date().toISOString() }
    setComments(prev => [...prev, tempComment])
    setCommentBody('')

    try {
      const session = await ensureGuestSession()
      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: card!.id, user_id: session!.user.id, body })
        .select('id, body, created_at')
        .single()

      if (error) throw error
      setComments(prev => prev.map(c => c.id === tempId ? (data as CommentEntry) : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = () => {
    onDelete(card.id ?? card.title)
    onClose()
  }

  const formattedDate = form.due_date
    ? new Date(form.due_date + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{columnTitle}</p>
            <textarea
              ref={titleRef}
              value={form.title}
              rows={1}
              onChange={e => {
                const value = e.target.value.replace(/\n/g, '')
                setForm(f => ({ ...f, title: value }))
                setTitleError(false)
                autoResize(e.target)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.preventDefault()
                if (e.key === 'Escape') onClose()
              }}
              placeholder="Task title"
              className={`w-full resize-none overflow-hidden bg-transparent text-xl font-semibold text-slate-900 outline-none dark:text-slate-100 ${
                titleError ? 'placeholder-red-400' : 'placeholder-slate-400 dark:placeholder-slate-500'
              }`}
            />
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[32rem] border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-4 border-r border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex rounded-lg border border-slate-200 p-0.5 gap-0.5 dark:border-slate-700">
                {PRIORITY_CYCLE.map(p => {
                  const active = form.priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        active ? PRIORITY_CONFIG[p].badge : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {PRIORITY_CONFIG[p].icon}
                      {p}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => dateRef.current?.showPicker()}
                className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700 select-none dark:text-slate-400 dark:hover:text-slate-200"
              >
                <LuCalendarDays className="h-3.5 w-3.5 text-slate-400" />
                {formattedDate ?? 'Set due date'}
              </button>
              <input
                ref={dateRef}
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
              />
            </div>

            <div className="relative mb-4 flex flex-wrap items-center gap-1.5">
              {form.label_ids.map(id => {
                const label = labels.find(l => l.id === id)
                if (!label) return null
                const config = LABEL_PALETTE[label.color]
                return (
                  <span
                    key={id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
                  >
                    {label.name}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, label_ids: f.label_ids.filter(x => x !== id) }))}
                      className="opacity-50 hover:opacity-100 transition"
                      aria-label={`Remove ${label.name}`}
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
              <button
                type="button"
                onClick={() => setLabelPickerOpen(v => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 transition hover:border-slate-400 hover:text-slate-600 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-300"
              >
                <FiPlus className="h-3 w-3" />
                {form.label_ids.length === 0 ? 'Add label' : ''}
              </button>
              {labelPickerOpen && (
                <LabelPicker
                  labels={labels}
                  selected={form.label_ids}
                  onToggle={id => setForm(f => ({
                    ...f,
                    label_ids: f.label_ids.includes(id)
                      ? f.label_ids.filter(x => x !== id)
                      : [...f.label_ids, id],
                  }))}
                  onCreate={async (name, color) => {
                    const label = await onCreateLabel(name, color)
                    if (label) setForm(f => ({ ...f, label_ids: [...f.label_ids, label.id] }))
                    return label
                  }}
                  onDelete={id => {
                    onDeleteLabel(id)
                    setForm(f => ({ ...f, label_ids: f.label_ids.filter(x => x !== id) }))
                  }}
                  onClose={() => setLabelPickerOpen(false)}
                />
              )}
            </div>

            <textarea
              value={form.description}
              rows={10}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Escape') onClose() }}
              placeholder="Add a description…"
              className="flex-1 w-full resize-none bg-transparent text-sm leading-relaxed text-slate-700 placeholder-slate-400 outline-none dark:text-slate-300 dark:placeholder-slate-600"
            />
          </div>

          <div className="flex w-2/5 flex-col">
            <div className="px-4 pt-4">
              <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800">
                {(['activity', 'comments'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-3 pb-2.5 text-xs font-medium capitalize transition border-b-2 -mb-px ${
                      tab === t
                        ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-4 py-4">
              {tab === 'activity' && (
                activityLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {activity.map(entry => (
                      <div key={entry.id} className="flex items-center gap-2.5">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {entryLabel(entry)}
                          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{timeAgo(entry.created_at)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'comments' && (
                <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                  {commentsLoading ? (
                    <div className="space-y-3">
                      {[0, 1].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                          <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            Y
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400 mb-0.5 dark:text-slate-500">{timeAgo(c.created_at)}</p>
                            <p className="text-sm text-slate-700 leading-snug whitespace-pre-wrap break-words dark:text-slate-300">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No comments yet — be the first.</p>
                  )}

                  <div className="mt-auto flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-slate-400 transition dark:border-slate-700 dark:bg-slate-800/60 dark:focus-within:border-slate-600">
                    <textarea
                      value={commentBody}
                      rows={1}
                      onChange={e => { setCommentBody(e.target.value); autoResize(e.target) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() }
                      }}
                      placeholder="Add a comment…"
                      className="flex-1 resize-none overflow-hidden bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none leading-relaxed dark:text-slate-300 dark:placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!commentBody.trim() || submitting}
                      className="mb-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      aria-label="Send comment"
                    >
                      <FiSend className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm text-red-400 transition hover:text-red-600"
          >
            <FiTrash2 className="h-4 w-4" />
            Delete task
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
