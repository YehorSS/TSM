import { useEffect, useState } from 'react'
import { cityByKey } from '../core/cities'
import { addDays } from '../core/search'
import type { Trip } from '../core/types'
import { today } from './format'
import { dict, LangContext, LANGS, systemLang, type Lang } from './i18n'
import { ResultsScreen } from './ResultsScreen'
import { SearchScreen, type Query } from './SearchScreen'
import { LoyaltyCard } from './LoyaltyCard'
import { TripDetails } from './TripDetails'
import { loyaltyCode } from '../core/loyalty'

const load = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '') ?? d
  } catch {
    return d
  }
}
// Старые сохранения: до 2026-10-24 город хранился ключом (строкой). Крупные города берём
// из свежего справочника — так у них появляются новые поля (например, английское название).
const fix = (q: any): Query | null => {
  const c = (v: any) => (typeof v === 'string' ? cityByKey(v) : (v && cityByKey(v.key)) ?? v)
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
  const [lang, setLang] = useState<Lang>(() => {
    const l = load<string>('lang', '')
    return (LANGS as string[]).includes(l) ? (l as Lang) : systemLang()
  })
  const [query, setQuery] = useState<Query>(() => {
    const q = fix(load('query', null)) ?? { from: cityByKey('milano')!, to: cityByKey('roma')!, date: addDays(today(), 1), mode: 'all' as const }
    return { ...q, date: q.date < today() ? today() : q.date }
  })
  const [screen, setScreen] = useState<'search' | 'results'>('search')
  const [recent, setRecent] = useState<Query[]>(() => load<any[]>('recent', []).map(fix).filter((q): q is Query => !!q))
  const [trip, setTrip] = useState<Trip | null>(null)
  const [card, setCard] = useState(false)
  const [code, setCode] = useState(loyaltyCode())
  const t = dict(lang)
  useEffect(() => void (document.documentElement.lang = lang), [lang])

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

  const pickLang = (l: Lang) => {
    setLang(l)
    save('lang', l)
  }

  return (
    <LangContext.Provider value={t}>
      <div className="stars" aria-hidden="true" />
      <nav className="langs" aria-label="Language">
        <button type="button" className={`langs__card ${code ? 'is-set' : ''}`} onClick={() => setCard(true)}>
          {t.cardBtn}{code && ' ✓'}
        </button>
        {LANGS.map((l) => (
          <button type="button" key={l} className={l === lang ? 'is-on' : ''} aria-pressed={l === lang}
            title={dict(l).langName} onClick={() => pickLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </nav>
      {screen === 'search' ? (
        <SearchScreen query={query} setQuery={setQuery} onSearch={run} recent={recent} />
      ) : (
        <ResultsScreen key={code} query={query} onBack={() => setScreen('search')} onDate={(date) => run({ ...query, date })} onOpen={setTrip} />
      )}
      {trip && <TripDetails trip={trip} onClose={() => setTrip(null)} />}
      {card && <LoyaltyCard onClose={() => setCard(false)} onChange={setCode} />}
    </LangContext.Provider>
  )
}
