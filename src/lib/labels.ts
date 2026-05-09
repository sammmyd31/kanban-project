export type LabelColor =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'green'
  | 'teal' | 'blue' | 'indigo' | 'violet' | 'pink'

export type Label = {
  id: string
  name: string
  color: LabelColor
}

export const LABEL_NAME_MAX = 24

export const LABEL_COLORS: LabelColor[] = [
  'red', 'orange', 'amber', 'yellow', 'green',
  'teal', 'blue', 'indigo', 'violet', 'pink',
]

export const LABEL_PALETTE: Record<LabelColor, { bg: string; text: string }> = {
  red:    { bg: 'bg-red-100 dark:bg-red-900/50',    text: 'text-red-700 dark:text-red-300'    },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300' },
  amber:  { bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-700 dark:text-amber-300'  },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300' },
  green:  { bg: 'bg-green-100 dark:bg-green-900/50',  text: 'text-green-700 dark:text-green-300'  },
  teal:   { bg: 'bg-teal-100 dark:bg-teal-900/50',   text: 'text-teal-700 dark:text-teal-300'   },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/50',   text: 'text-blue-700 dark:text-blue-300'   },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-700 dark:text-violet-300' },
  pink:   { bg: 'bg-pink-100 dark:bg-pink-900/50',   text: 'text-pink-700 dark:text-pink-300'   },
}

export const LABEL_DOT: Record<LabelColor, string> = {
  red:    'bg-red-400',
  orange: 'bg-orange-400',
  amber:  'bg-amber-400',
  yellow: 'bg-yellow-400',
  green:  'bg-green-400',
  teal:   'bg-teal-400',
  blue:   'bg-blue-400',
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
  pink:   'bg-pink-400',
}
