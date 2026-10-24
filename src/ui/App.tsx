import { useState } from 'react'
import { cityByKey } from '../core/cities'
import { addDays } from '../core/search'
import type { Trip } from '../core/types'
import { today } from './format'
import { ResultsScreen } from './ResultsScreen'
import { SearchScreen, type Query } from './SearchScreen'
import { TripDetails } from './TripDetails'

const load = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '') ?? d
  } catch {
    return d
  }
}
// до 2026-10-24 города хранились ключом (строкой) — переводим старые сохранения в объекты
const fix = (q: any): Query | null => {
  const c = (v: any) => (typeof v === 'string' ? cityByKey(v) : v)
  const from = c(q?.from)
  const to = c(q?.to)
  return from?.key && to?.key ? { ...q, from, to } : null
}
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function App() {
  const [query, setQuery] = useState<Query>(() => {
    const q = fix(load('query', null)) ?? { from: cityByKey('milano')!, to: cityByKey('roma')!, date: addDays(today(), 1), mode: 'all' as const }
    return { ...q, date: q.date < today() ? today() : q.date }
  })
  const [screen, setScreen] = useState<'search' | 'results'>('search')
  const [recent, setRecent] = useState<Query[]>(() => load<any[]>('recent', []).map(fix).filter((q): q is Query => !!q))
  const [trip, setTrip] = useState<Trip | null>(null)

  const run = (next: Query) => {
    // обратно не может быть раньше, чем туда (например, после выбора дня на линии цен)
    const q = next.back && next.back < (next.dateTo ?? next.date) ? { ...next, back: null, backTo: null } : next
    setQuery(q)
    save('query', q)
    const r = [q, ...recent.filter((x) => x.from.key !== q.from.key || x.to.key !== q.to.key)].slice(0, 4)
    setRecent(r)
    save('recent', r)
    setScreen('results')
  }

  return (
    <>
      <div className="stars" aria-hidden="true" />
      {screen === 'search' ? (
        <SearchScreen query={query} setQuery={setQuery} onSearch={run} recent={recent} />
      ) : (
        <ResultsScreen query={query} onBack={() => setScreen('search')} onDate={(date) => run({ ...query, date })} onOpen={setTrip} />
      )}
      {trip && <TripDetails trip={trip} onClose={() => setTrip(null)} />}
    </>
  )
}
