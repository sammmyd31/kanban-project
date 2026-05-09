import { LuCalendarDays } from 'react-icons/lu'
import { FiChevronDown, FiMinus, FiChevronUp } from 'react-icons/fi'
import type { Label } from '../lib/labels'
import { LABEL_PALETTE } from '../lib/labels'

export type Priority = 'Low' | 'Medium' | 'High'

export type Card = {
  id?: string
  title: string
  description?: string
  priority?: Priority
  due_date?: Date
  label_ids?: string[]
}

interface KanbanCardProps {
  card: Card
  allLabels?: Label[]
  isComplete?: boolean
  index?: number
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void
  onClick?: () => void
}

const PRIORITY_CONFIG: Record<Priority, { stripe: string; icon: React.ReactNode }> = {
  High:   { stripe: 'border-l-red-400',     icon: <FiChevronUp   className="h-3.5 w-3.5 text-red-400"     /> },
  Medium: { stripe: 'border-l-amber-400',   icon: <FiMinus       className="h-3.5 w-3.5 text-amber-400"   /> },
  Low:    { stripe: 'border-l-emerald-400', icon: <FiChevronDown className="h-3.5 w-3.5 text-emerald-400" /> },
}

export default function KanbanCard({ card, allLabels = [], isComplete = false, index, draggable = false, onDragStart, onClick }: KanbanCardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  const isOverdue = !isComplete && !!card.due_date && card.due_date < today
  const isDueSoon = !isComplete && !isOverdue && !!card.due_date && card.due_date <= threeDaysFromNow

  const due = card.due_date
    ? card.due_date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
    : null

  const priority = card.priority ? PRIORITY_CONFIG[card.priority] : null
  const cardLabels = allLabels.filter(l => card.label_ids?.includes(l.id))

  return (
    <div
      data-index={index}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={[
        'rounded-2xl border px-4 py-4 shadow-sm transition cursor-pointer hover:shadow-md active:cursor-grabbing',
        isOverdue ? 'bg-red-50 dark:bg-red-950/30' : isDueSoon ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-800',
        priority
          ? `border-l-4 ${priority.stripe} border-t-slate-200 border-r-slate-200 border-b-slate-200 dark:border-t-slate-700 dark:border-r-slate-700 dark:border-b-slate-700 hover:border-t-slate-300 hover:border-r-slate-300 hover:border-b-slate-300 dark:hover:border-t-slate-600 dark:hover:border-r-slate-600 dark:hover:border-b-slate-600`
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug dark:text-slate-100">{card.title}</h3>
        {isOverdue && (
          <span className="shrink-0 text-xs font-medium text-red-400/50 mt-px">Overdue</span>
        )}
        {isDueSoon && (
          <span className="shrink-0 text-xs font-medium text-amber-400/70 mt-px">Due soon</span>
        )}
      </div>

      {cardLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cardLabels.map(label => {
            const config = LABEL_PALETTE[label.color]
            return (
              <span
                key={label.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
              >
                {label.name}
              </span>
            )
          })}
        </div>
      )}

      {card.description && (
        <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 dark:text-slate-400">{card.description}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {due && (
          <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
            <LuCalendarDays className="h-3 w-3 shrink-0" />
            {due}
          </span>
        )}
        {priority && (
          <span className="ml-auto flex items-center" aria-label={card.priority}>
            {priority.icon}
          </span>
        )}
      </div>
    </div>
  )
}
