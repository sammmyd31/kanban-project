import { useState } from 'react'
import { FiGrid, FiMoon, FiPlus, FiSun, FiTag } from 'react-icons/fi'
import KanbanColumn from './components/KanbanColumn'
import TaskDetailModal from './components/TaskDetailModal'
import LabelPicker from './components/LabelPicker'
import { useTasks, COLUMN_DEFS } from './hooks/useTasks'
import { useLabels } from './hooks/useLabels'
import { useDarkMode } from './hooks/useDarkMode'
import { LABEL_PALETTE } from './lib/labels'
import type { Card } from './components/KanbanCard'

type DetailState = { card: Card; columnTitle: string }

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}

function SkeletonBoard() {
  return (
    <div className="min-h-screen bg-[#f4f4f6] text-black dark:bg-slate-950 dark:text-white">
      <header className="w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                <FiGrid className="h-4 w-4 text-white dark:text-slate-900" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Kanban</span>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full px-6 py-6">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          {COLUMN_DEFS.map((col) => (
            <article key={col.title} className={`rounded-3xl border ${col.tint} p-4 shadow-lg`}>
              <div className="flex items-center gap-3 pb-4">
                <span className={`h-3 w-3 rounded-full ${col.accent}`} />
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{col.title}</h2>
              </div>
              <div className="flex flex-col gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

function App() {
  const { columns, loading, error, lastMoveAt, addCard, editCard, deleteCard, moveCard } = useTasks()
  const { labels, createLabel, deleteLabel } = useLabels()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [activeLabels, setActiveLabels] = useState<string[]>([])
  const [headerPickerOpen, setHeaderPickerOpen] = useState(false)

  if (loading) return <SkeletonBoard />

  const handleDeleteLabel = (id: string) => {
    deleteLabel(id)
    setActiveLabels(prev => prev.filter(x => x !== id))
  }

  const toggleActiveLabel = (id: string) =>
    setActiveLabels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const displayColumns = activeLabels.length === 0
    ? columns
    : columns.map(col => ({
        ...col,
        cards: col.cards.filter(card =>
          activeLabels.some(id => card.label_ids?.includes(id))
        ),
      }))

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-black dark:bg-slate-950 dark:text-white">
      <header className="w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                <FiGrid className="h-4 w-4 text-white dark:text-slate-900" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Kanban</span>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-1 flex-wrap items-center gap-2">
              {labels.length === 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setHeaderPickerOpen(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    <FiTag className="h-3.5 w-3.5" />
                    Add a label
                  </button>
                  {headerPickerOpen && (
                    <LabelPicker
                      labels={labels}
                      selected={activeLabels}
                      onToggle={toggleActiveLabel}
                      onCreate={createLabel}
                      onDelete={handleDeleteLabel}
                      onClose={() => setHeaderPickerOpen(false)}
                    />
                  )}
                </div>
              ) : (
                <>
                  {labels.map(label => {
                    const active = activeLabels.includes(label.id)
                    const config = LABEL_PALETTE[label.color]
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleActiveLabel(label.id)}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? `${config.bg} ${config.text}`
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
                        }`}
                      >
                        {label.name}
                      </button>
                    )
                  })}
                  <div className="relative">
                    <button
                      onClick={() => setHeaderPickerOpen(v => !v)}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
                      aria-label="Add label"
                    >
                      <FiPlus className="h-3.5 w-3.5" />
                    </button>
                    {headerPickerOpen && (
                      <LabelPicker
                        labels={labels}
                        selected={activeLabels}
                        onToggle={toggleActiveLabel}
                        onCreate={createLabel}
                        onDelete={handleDeleteLabel}
                        onClose={() => setHeaderPickerOpen(false)}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={toggleDark}
              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FiSun className="h-4.5 w-4.5" /> : <FiMoon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      <main className="w-full px-6 py-6">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          {displayColumns.map((column) => (
            <KanbanColumn
              key={column.title}
              title={column.title}
              accent={column.accent}
              tint={column.tint}
              cards={column.cards}
              labels={labels}
              onAddCard={(card) => addCard(column.title, card)}
              onOpenDetail={(card) => setDetail({ card, columnTitle: column.title })}
              onMoveCard={moveCard}
              onCreateLabel={createLabel}
              onDeleteLabel={handleDeleteLabel}
            />
          ))}
        </section>
      </main>

      <TaskDetailModal
        card={detail?.card ?? null}
        columnTitle={detail?.columnTitle ?? ''}
        lastMoveAt={lastMoveAt}
        onClose={() => setDetail(null)}
        onSave={(card) => editCard(detail!.columnTitle, card)}
        onDelete={(cardId) => deleteCard(detail!.columnTitle, cardId)}
        labels={labels}
        onCreateLabel={createLabel}
        onDeleteLabel={handleDeleteLabel}
      />
    </div>
  )
}

export default App
