import { useEffect, useState } from 'react'
import { searchVia } from '../core/hubs'
import { addDays, priceDays, type DayPrice } from '../core/search'
import type { City, Mode } from '../core/types'

/** Самый дешёвый день; при равной цене — более ранний. null, если цен нет. */
export function cheapestDay(days: DayPrice[]): DayPrice | null {
  return days.reduce<DayPrice | null>((m, d) => (d.min != null && (m == null || d.min < m.min!) ? d : m), null)
}

/** Дни с first по last включительно. */
export function daysBetween(first: string, last: string): string[] {
  const out: string[] = []
  for (let d = first; d <= last; d = addDays(d, 1)) out.push(d)
  return out
}

/** Минимальная цена на каждый из дней [first, first + count): заготовка сразу, цены — по мере ответа.
 *  via — со склейками через пересадочный узел (поиск по периоду). */
export function useDayPrices(from: City, to: City, first: string, count: number, modes: Mode[], via = false) {
  const [days, setDays] = useState<DayPrice[]>([])
  const [done, setDone] = useState(false)
  const key = modes.join()

  useEffect(() => {
    let live = true
    setDone(false)
    setDays(Array.from({ length: count }, (_, i) => ({ date: addDays(first, i), min: null, loading: true })))
    priceDays(from, to, first, modes, count, undefined, (d) =>
      live && setDays((list) => list.map((x) => (x.date === d.date ? d : x))),
      via ? searchVia : undefined,
    )
      .catch(() => {})
      .finally(() => live && setDone(true))
    return () => void (live = false)
  }, [from.key, to.key, first, count, key, via])

  return { days, done }
}
