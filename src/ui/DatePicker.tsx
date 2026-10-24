import { useState } from 'react'
import { addDays } from '../core/search'
import { today } from './format'
import { useT } from './i18n'

const ym = (date: string) => date.slice(0, 7) // «2026-12»

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

export const MAX_PERIOD = 31 // дней: каждый день — отдельные запросы к перевозчикам

/** Второй клик периода: упорядочивает края и обрезает до MAX_PERIOD дней. */
export function periodEnd(start: string, clicked: string): [string, string] {
  const [a, b] = clicked < start ? [clicked, start] : [start, clicked]
  const max = addDays(a, MAX_PERIOD - 1)
  return [a, b > max ? max : b]
}

/** Календарь без листания: ряд месяцев на год вперёд и сетка дней выбранного месяца.
 *  Режим «Период»: первый клик — начало, второй — конец. */
export function DatePicker({ value, to = null, onPick, min, quick = true }: {
  value: string
  to?: string | null // конец периода; null — один день
  onPick: (date: string, to: string | null) => void
  min?: string // раньше этой даты выбрать нельзя (для обратного билета — дата отъезда)
  quick?: boolean // кнопки «Сегодня / Завтра / Послезавтра»
}) {
  const tr = useT()
  const t = today()
  const from = min && min > t ? min : t
  // месяцы и дни недели — из Intl на языке интерфейса (2027-01-04 — понедельник)
  const monthName = (m: string) => new Date(m + '-15T12:00:00').toLocaleDateString(tr.locale, { month: 'short' }).replace('.', '')
  const dows = Array.from({ length: 7 }, (_, i) => tr.weekday(addDays('2027-01-04', i)))
  const [month, setMonth] = useState(ym(value < from ? from : value))
  const [period, setPeriod] = useState(!!to)
  const [start, setStart] = useState<string | null>(null) // начало периода, ждём второй клик
  const months = nextMonths(from)

  const click = (d: string) => {
    if (!period) return onPick(d, null)
    if (!start) return setStart(d)
    const [a, b] = periodEnd(start, d)
    setStart(null)
    onPick(a, b === a ? null : b)
  }
  // готовые периоды: неделя, две недели, весь открытый месяц (от сегодня/min, не больше MAX_PERIOD)
  const monthEnd = monthCells(month).filter(Boolean).at(-1)!
  const monthStart = `${month}-01` < from ? from : `${month}-01`
  const longName = new Date(month + '-15T12:00:00').toLocaleDateString(tr.locale, { month: 'long' })
  const presets: [string, string, string][] = tr.presets(longName).map((label, i) =>
    i === 0 ? [label, from, addDays(from, 6)] : i === 1 ? [label, from, addDays(from, 13)] : [label, ...periodEnd(monthStart, monthEnd)],
  ) as [string, string, string][]
  const lo = start ?? value
  const hi = start ? null : to

  return (
    <span className="cal">
      <span className="cal__mode" role="tablist" aria-label={tr.calOneDay + ' / ' + tr.calPeriod}>
        <button type="button" role="tab" aria-selected={!period} className={!period ? 'is-on' : ''}
          onClick={() => (setPeriod(false), setStart(null))}>{tr.calOneDay}</button>
        <button type="button" role="tab" aria-selected={period} className={period ? 'is-on' : ''}
          onClick={() => setPeriod(true)}>{tr.calPeriod}</button>
      </span>

      {quick && !period && <span className="cal__quick">
        {tr.calQuick.map((label, i) => (
          <button type="button" key={label} className={`btn btn--ghost ${value === addDays(t, i) && !to ? 'is-on' : ''}`}
            onClick={() => onPick(addDays(t, i), null)}>
            {label}
          </button>
        ))}
      </span>}

      {period && (
        <>
          <span className="cal__presets">
            {presets.map(([label, a, b]) => (
              <button type="button" key={label} className="btn btn--ghost" onClick={() => (setStart(null), onPick(a, b))}>{label}</button>
            ))}
          </span>
          <span className="cal__range">
            <span className={`cal__edge ${!start ? 'is-active' : ''}`}>
              <small>{tr.calFrom}</small>{start ? tr.dayMonth(start) : to ? tr.dayMonth(value) : '—'}
            </span>
            <span className={`cal__edge ${start ? 'is-active' : ''}`}>
              <small>{tr.calTo}</small>{start ? '…' : to ? tr.dayMonth(to) : '—'}
            </span>
          </span>
          <span className="cal__hint">{start ? tr.calLast : tr.calFirst(MAX_PERIOD)}</span>
        </>
      )}

      <span className="cal__months" role="tablist" aria-label="Month">
        {months.map((m) => {
          const y = m.slice(0, 4)
          return (
            <button type="button" role="tab" key={m} aria-selected={m === month}
              className={`cal__month ${m === month ? 'is-on' : ''}`} onClick={() => setMonth(m)}>
              {monthName(m)}
              {y !== t.slice(0, 4) && <small>{y}</small>}
            </button>
          )
        })}
      </span>

      <span className="cal__grid">
        {dows.map((d) => <span key={d} className="cal__dow">{d}</span>)}
        {monthCells(month).map((d, i) =>
          d ? (
            <button type="button" key={d} disabled={d < from}
              className={`cal__day ${d === lo || d === hi ? 'is-on' : ''} ${hi && d > lo && d < hi ? 'is-in' : ''} ${d === t ? 'is-today' : ''}`}
              onClick={() => click(d)} aria-label={tr.dayMonth(d)}>
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
