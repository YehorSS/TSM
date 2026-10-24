import { useState } from 'react'
import { addDays } from '../core/search'
import { today } from './format'

const ym = (date: string) => date.slice(0, 7) // «2026-12»
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** 12 месяцев вперёд от текущего: «2026-10», «2026-11», … */
export function nextMonths(from: string, n = 12): string[] {
  const [y, m] = from.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const k = m - 1 + i
    return `${y + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`
  })
}

/** Клетки месяца с понедельника; null — пустые клетки до первого числа. */
export function monthCells(month: string): (string | null)[] {
  const first = `${month}-01`
  const lead = (new Date(first + 'T12:00:00').getDay() + 6) % 7
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = first; ym(d) === month; d = addDays(d, 1)) cells.push(d)
  return cells
}

/** Календарь без листания: ряд месяцев на год вперёд и сетка дней выбранного месяца. */
export function DatePicker({ value, onPick, min, quick = true }: {
  value: string
  onPick: (date: string) => void
  min?: string // раньше этой даты выбрать нельзя (для обратного билета — дата отъезда)
  quick?: boolean // кнопки «Сегодня / Завтра / Послезавтра»
}) {
  const t = today()
  const from = min && min > t ? min : t
  const [month, setMonth] = useState(ym(value < from ? from : value))
  const months = nextMonths(from)

  return (
    <span className="cal">
      {quick && <span className="cal__quick">
        {['Сегодня', 'Завтра', 'Послезавтра'].map((label, i) => (
          <button type="button" key={label} className={`btn btn--ghost ${value === addDays(t, i) ? 'is-on' : ''}`}
            onClick={() => onPick(addDays(t, i))}>
            {label}
          </button>
        ))}
      </span>}

      <span className="cal__months" role="tablist" aria-label="Месяц">
        {months.map((m) => {
          const [y, mm] = m.split('-')
          return (
            <button type="button" role="tab" key={m} aria-selected={m === month}
              className={`cal__month ${m === month ? 'is-on' : ''}`} onClick={() => setMonth(m)}>
              {MONTHS[Number(mm) - 1]}
              {y !== t.slice(0, 4) && <small>{y}</small>}
            </button>
          )
        })}
      </span>

      <span className="cal__grid">
        {DAYS.map((d) => <span key={d} className="cal__dow">{d}</span>)}
        {monthCells(month).map((d, i) =>
          d ? (
            <button type="button" key={d} disabled={d < from}
              className={`cal__day ${d === value ? 'is-on' : ''} ${d === t ? 'is-today' : ''}`}
              onClick={() => onPick(d)} aria-label={new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}>
              {Number(d.slice(8))}
            </button>
          ) : (
            <span key={'e' + i} />
          ),
        )}
      </span>
    </span>
  )
}
