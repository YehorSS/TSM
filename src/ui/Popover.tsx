import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Слово-кнопка во фразе поиска; по нажатию под ним раскрывается панель выбора. */
export function Popover({ label, children, wide, center }: {
  label: ReactNode
  children: (close: () => void) => ReactNode
  wide?: boolean
  center?: boolean // большая панель — по центру окна, чтобы не обрезалась снизу
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => ref.current?.contains(e.target as Node) || setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <span className="pop" ref={ref}>
      <button type="button" className={`word ${open ? 'word--open' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && <span className={`pop__panel ${wide ? 'pop__panel--wide' : ''} ${center ? 'pop__panel--center' : ''}`}>{children(() => setOpen(false))}</span>}
    </span>
  )
}
