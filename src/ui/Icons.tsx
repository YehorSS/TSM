import type { Mode } from '../core/types'

// Контурные значки в духе Lucide (ISC), упрощены под 24×24.
const P: Record<Mode | 'all', string> = {
  train: 'M8 3h8a4 4 0 0 1 4 4v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a4 4 0 0 1 4-4Zm-4 8h16M12 3v8M8 14.5h.01M16 14.5h.01M7 21l2-4m8 4-2-4',
  bus: 'M5 4h14a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2Zm-2 6h18M9 4v6m6-6v6M6 17v2.5M18 17v2.5M7 13.5h.01M17 13.5h.01',
  plane:
    'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z',
  all: 'M3 12h18m-4-4 4 4-4 4M7 8l-4 4 4 4',
}

export function ModeIcon({ mode, size = 22 }: { mode: Mode | 'all'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[mode]} />
    </svg>
  )
}
