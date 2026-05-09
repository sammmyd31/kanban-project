import { Fragment, useState } from 'react'
import KanbanCard from './KanbanCard'
import QuickCreateCard from './QuickCreateCard'
import type { Card } from './KanbanCard'
import type { Label, LabelColor } from '../lib/labels'

interface KanbanColumnProps {
  title: string
  accent?: string
  tint?: string
  cards: Card[]
  labels: Label[]
  isComplete?: boolean
  onAddCard: (card: Omit<Card, 'id'>) => void
  onOpenDetail: (card: Card) => void
  onMoveCard: (cardId: string, sourceTitle: string, targetTitle: string, targetIndex: number) => void
  onCreateLabel: (name: string, color: LabelColor) => Promise<Label | null>
  onDeleteLabel: (id: string) => void
}

export default function KanbanColumn({
  title,
  accent = 'bg-slate-900',
  tint = 'bg-white',
  cards,
  labels,
  isComplete = false,
  onAddCard,
  onOpenDetail,
  onMoveCard,
  onCreateLabel,
  onDeleteLabel,
}: KanbanColumnProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  return (
    <article
      onDragOver={(event) => {
        event.preventDefault()
        const els = Array.from(event.currentTarget.querySelectorAll('[data-index]')) as HTMLElement[]
        let found = cards.length
        for (const el of els) {
          const r = el.getBoundingClientRect()
          if (event.clientY < r.top + r.height / 2) { found = Number(el.dataset.index); break }
        }
        if (found !== hoverIndex) setHoverIndex(found)
        if (!isDraggingOver) setIsDraggingOver(true)
      }}
      onDragEnter={() => { if (!isDraggingOver) setIsDraggingOver(true) }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setIsDraggingOver(false)
        setHoverIndex(null)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDraggingOver(false)
        const cardId = event.dataTransfer.getData('text/card-id')
        const sourceTitle = event.dataTransfer.getData('text/source-column')
        if (!cardId || !sourceTitle) return
        const idx = hoverIndex ?? cards.length
        setHoverIndex(null)
        onMoveCard(cardId, sourceTitle, title, idx)
      }}
      className={`rounded-3xl border ${tint} p-4 shadow-lg transition ${
        isDraggingOver ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-slate-500 dark:ring-offset-slate-950' : ''
      }`}
    >
      <div className="flex items-center gap-3 pb-4">
        <span className={`h-3 w-3 rounded-full ${accent}`} />
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
        <span className="ml-auto text-sm font-medium text-slate-400 dark:text-slate-500">{cards.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {cards.map((card, i) => (
          <Fragment key={card.id ?? card.title}>
            {hoverIndex === i && <div className="h-0.5 rounded bg-blue-400 translate-y-px" aria-hidden />}
            <KanbanCard
              card={card}
              allLabels={labels}
              isComplete={isComplete}
              index={i}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/card-id', card.id ?? card.title)
                event.dataTransfer.setData('text/source-column', title)
                event.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => onOpenDetail(card)}
            />
          </Fragment>
        ))}
        {hoverIndex === cards.length && <div className="h-0.5 rounded bg-blue-400 translate-y-px" aria-hidden />}

        {isCreating && (
          <QuickCreateCard
            labels={labels}
            onCreateLabel={onCreateLabel}
            onDeleteLabel={onDeleteLabel}
            onAdd={(card) => { onAddCard(card); setIsCreating(false) }}
            onCancel={() => setIsCreating(false)}
          />
        )}
      </div>

      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="mt-4 w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
        >
          + Add task
        </button>
      )}
    </article>
  )
}
