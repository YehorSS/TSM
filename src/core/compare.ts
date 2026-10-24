// Сравнение вариантов по виду транспорта и пасс Trenitalia «Italia in Tour».
import { labels, minutes } from './search'
import type { Trip } from './types'

export type Kind = 'regional' | 'intercity' | 'frecce' | 'flixtrain' | 'bus' | 'plane'
export const KINDS: Kind[] = ['regional', 'intercity', 'frecce', 'flixtrain', 'bus', 'plane']

/** Вид транспорта для сравнения: у поездов — по самому быстрому классу поезда в поездке. */
export function kindOf(t: Trip): Kind {
  if (t.mode !== 'train') return t.mode
  const v = t.vehicles.join(' ').toLowerCase()
  if (v.includes('flixtrain')) return 'flixtrain'
  if (/freccia|italo/.test(v)) return 'frecce'
  if (/intercity|eurocity|\bic\b/.test(v)) return 'intercity'
  return 'regional'
}

export interface Row {
  kind: Kind
  trip: Trip // самый дешёвый вариант этого вида
  fastest: Trip // самый быстрый вариант этого вида
}

/** По строке на вид транспорта: самый дешёвый и самый быстрый вариант. Порядок — по цене. */
export function compareKinds(trips: Trip[]): Row[] {
  const rows: Row[] = []
  for (const kind of KINDS) {
    const list = trips.filter((t) => kindOf(t) === kind)
    const l = labels(list)
    if (l.cheapest && l.fastest) rows.push({ kind, trip: l.cheapest, fastest: l.fastest })
  }
  return rows.sort((a, b) => a.trip.price! - b.trip.price!)
}

/** Разница с базовым вариантом: + — дороже/дольше. */
export const diff = (t: Trip, base: Trip) => ({
  euro: Math.round((t.price! - base.price!) * 100) / 100,
  min: minutes(t) - minutes(base),
})

// Пасс «Italia in Tour»: безлимит на региональных поездах Trenitalia, 2-й класс.
// ponytail: цены и условия зашиты по состоянию на 2026-10-24 — акция временная, проверять на trenitalia.com.
export const PASSES = [
  { days: 3, price: 35 },
  { days: 5, price: 59 },
]

/** Пасс, который выгоднее билетов на эти региональные поездки, или null.
 *  Поездки должны уложиться в срок пасса (считая день первой поездки). */
export function passBeats(trips: Trip[]): { days: number; price: number; tickets: number } | null {
  if (!trips.length || trips.some((t) => kindOf(t) !== 'regional' || t.price == null)) return null
  const dates = trips.map((t) => t.depart.slice(0, 10)).sort()
  const span = Math.round((Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86400000) + 1
  const tickets = Math.round(trips.reduce((s, t) => s + t.price!, 0) * 100) / 100
  const pass = PASSES.find((p) => span <= p.days && p.price < tickets)
  return pass ? { ...pass, tickets } : null
}
