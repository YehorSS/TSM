import { useState } from 'react'
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
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function App() {
  const [query, setQuery] = useState<Query>(() => {
    const q = load<Query>('query', { from: 'milano', to: 'roma', date: addDays(today(), 1), mode: 'all' })
    return { ...q, date: q.date < today() ? today() : q.date }
  })
  const [screen, setScreen] = useState<'search' | 'results'>('search')
  const [recent, setRecent] = useState<Query[]>(() => load('recent', []))
  const [trip, setTrip] = useState<Trip | null>(null)

  const run = (q: Query) => {
    setQuery(q)
    save('query', q)
    const r = [q, ...recent.filter((x) => x.from !== q.from || x.to !== q.to)].slice(0, 4)
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
