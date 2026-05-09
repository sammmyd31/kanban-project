import { useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiMinus, FiTag } from 'react-icons/fi'
import { LuCalendarDays } from 'react-icons/lu'
import LabelPicker from './LabelPicker'
import type { Card, Priority } from './KanbanCard'
import type { Label, LabelColor } from '../lib/labels'
import { LABEL_PALETTE } from '../lib/labels'

interface QuickCreateCardProps {
  labels: Label[]
  onCreateLabel: (name: string, color: LabelColor) => Promise<Label | null>
  onDeleteLabel: (id: string) => void
  onAdd: (card: Omit<Card, 'id'>) => void
  onCancel: () => void
}

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High']

const PRIORITY_CONFIG: Record<Priority, { active: string; icon: React.ReactNode }> = {
  Low:    { active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: <FiChevronDown className="h-3 w-3" /> },
  Medium: { active: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',         icon: <FiMinus       className="h-3 w-3" /> },
  High:   { active: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',                 icon: <FiChevronUp   className="h-3 w-3" /> },
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function QuickCreateCard({ labels, onCreateLabel, onDeleteLabel, onAdd, onCancel }: QuickCreateCardProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [showError, setShowError] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (!title.trim()) { setShowError(true); return }
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate ? new Date(dueDate + 'T00:00:00') : undefined,
      label_ids: selectedLabelIds,
    })
  }

  const toggleLabel = (id: string) =>
    setSelectedLabelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const formattedDate = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' })
    : null

  const selectedLabels = labels.filter(l => selectedLabelIds.includes(l.id))

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white px-4 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800">
      <textarea
        autoFocus
        value={title}
        rows={1}
        onChange={e => { setTitle(e.target.value.replace(/\n/g, '')); setShowError(false); autoResize(e.target) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={showError ? 'Title is required' : 'Task title'}
        className={`w-full resize-none overflow-hidden bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100 ${
          showError ? 'placeholder-red-400' : 'placeholder-slate-400 dark:placeholder-slate-500'
        }`}
      />

      <textarea
        value={description}
        rows={1}
        onChange={e => { setDescription(e.target.value); autoResize(e.target) }}
        onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        placeholder="Add a description…"
        className="mt-1 w-full resize-none overflow-hidden bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none dark:text-slate-400 dark:placeholder-slate-600"
      />

      {selectedLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedLabels.map(label => {
            const config = LABEL_PALETTE[label.color]
            return (
              <span key={label.id} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
                {label.name}
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dateRef.current?.showPicker()}
            className="flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-700 select-none dark:text-slate-400 dark:hover:text-slate-200"
          >
            <LuCalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {formattedDate ?? 'Due date'}
          </button>
          <input
            ref={dateRef}
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
          />

          <div className="flex rounded-md border border-slate-200 p-0.5 gap-0.5 dark:border-slate-600">
            {PRIORITIES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-label={p}
                className={`flex h-5 w-5 items-center justify-center rounded transition ${
                  priority === p
                    ? PRIORITY_CONFIG[p].active
                    : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50 dark:text-slate-600 dark:hover:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {PRIORITY_CONFIG[p].icon}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLabelPickerOpen(v => !v)}
              className={`flex items-center gap-1 text-xs transition select-none ${
                selectedLabelIds.length > 0
                  ? 'text-slate-600 dark:text-slate-300'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <FiTag className="h-3.5 w-3.5" />
              {selectedLabelIds.length > 0 ? selectedLabelIds.length : ''}
            </button>
            {labelPickerOpen && (
              <LabelPicker
                labels={labels}
                selected={selectedLabelIds}
                onToggle={toggleLabel}
                onCreate={async (name, color) => {
                  const label = await onCreateLabel(name, color)
                  if (label) toggleLabel(label.id)
                  return label
                }}
                onDelete={id => {
                  onDeleteLabel(id)
                  setSelectedLabelIds(prev => prev.filter(x => x !== id))
                }}
                onClose={() => setLabelPickerOpen(false)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}
