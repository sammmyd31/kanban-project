import { useState } from 'react'
import { FiCheck, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { Label, LabelColor } from '../lib/labels'
import { LABEL_COLORS, LABEL_DOT, LABEL_NAME_MAX, LABEL_PALETTE } from '../lib/labels'

interface LabelPickerProps {
  labels: Label[]
  selected: string[]
  onToggle: (id: string) => void
  onCreate: (name: string, color: LabelColor) => Promise<Label | null>
  onDelete: (id: string) => void
  onClose: () => void
  defaultShowCreate?: boolean
}

export default function LabelPicker({
  labels,
  selected,
  onToggle,
  onCreate,
  onDelete,
  onClose,
  defaultShowCreate = false,
}: LabelPickerProps) {
  const [showCreate, setShowCreate] = useState(defaultShowCreate || labels.length === 0)
  const [name, setName] = useState('')
  const [color, setColor] = useState<LabelColor>('blue')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    const label = await onCreate(name.trim(), color)
    if (label) {
      onToggle(label.id)
      setName('')
      setColor('blue')
      setShowCreate(false)
    }
    setCreating(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
        {labels.length > 0 && (
          <div className="p-1.5">
            {labels.map(label => {
              const isSelected = selected.includes(label.id)
              const config = LABEL_PALETTE[label.color]
              return (
                <div key={label.id} className="group flex w-full items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-700">
                  <button
                    type="button"
                    onClick={() => onToggle(label.id)}
                    className="flex flex-1 items-center gap-2 min-w-0"
                  >
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
                      {label.name}
                    </span>
                    {isSelected && <FiCheck className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(label.id)}
                    className="invisible shrink-0 rounded p-0.5 text-slate-300 transition hover:text-red-400 group-hover:visible dark:text-slate-600"
                    aria-label={`Delete ${label.name}`}
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className={`p-1.5 ${labels.length > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''}`}>
          {showCreate ? (
            <div className="space-y-2 p-1">
              <div className="relative">
                <input
                  autoFocus
                  value={name}
                  maxLength={LABEL_NAME_MAX}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      if (labels.length > 0) setShowCreate(false)
                      else onClose()
                    }
                  }}
                  placeholder="Label name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-500"
                />
                {name.length >= LABEL_NAME_MAX - 6 && (
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${name.length >= LABEL_NAME_MAX ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {LABEL_NAME_MAX - name.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-0.5">
                {LABEL_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full transition ${LABEL_DOT[c]} ${
                      color === c ? 'ring-2 ring-slate-400 ring-offset-1 dark:ring-slate-500' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                {labels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!name.trim() || creating}
                  className="flex-1 rounded-lg bg-slate-900 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <FiPlus className="h-3.5 w-3.5" />
              New label
            </button>
          )}
        </div>
      </div>
    </>
  )
}
