import { useEffect, useState } from 'react'
import { findCities } from '../core/cities'
import { searchPlaces } from '../core/places'
import { addDays } from '../core/search'
import type { City } from '../core/types'
import { MODE_PHRASE, today, whenPhrase } from './format'
import { ModeIcon } from './Icons'
import { Popover } from './Popover'
import { Typed } from './Typed'

export type ModeChoice = 'all' | 'train' | 'bus' | 'plane'
export interface Query {
  from: City
  to: City
  date: string
  mode: ModeChoice
}

function CityList({ exclude, onPick }: { exclude: City; onPick: (c: City) => void }) {
  const [q, setQ] = useState('')
  const [far, setFar] = useState<City[]>([])
  const [busy, setBusy] = useState(false)

  // любой город Италии — из справочников перевозчиков, с паузой, чтобы не спрашивать на каждую букву
  useEffect(() => {
    setFar([])
    if (q.trim().length < 3) return setBusy(false)
    setBusy(true)
    let live = true
    const id = setTimeout(() => {
      searchPlaces(q)
        .then((list) => live && setFar(list))
        .catch(() => {})
        .finally(() => live && setBusy(false))
    }, 350)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [q])

  const list = [...findCities(q), ...far].filter((c) => c.key !== exclude.key)
  return (
    <>
      <input
        className="pop__input"
        autoFocus
        placeholder="Город, например Чивитанова"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && list[0] && onPick(list[0])}
      />
      <span className="pop__list">
        {list.map((c) => (
          <button type="button" key={c.key} className="pop__item" onClick={() => onPick(c)}>
            {c.name}
            <small>{c.region ?? (c.it !== c.name ? c.it : '')}</small>
          </button>
        ))}
        {busy && <span className="pop__empty">Ищу по всей Италии…</span>}
        {!busy && !list.length && <span className="pop__empty">Не нашёл такой город. Попробуйте написать по-итальянски</span>}
      </span>
    </>
  )
}

const MODES: ModeChoice[] = ['all', 'train', 'bus', 'plane']
const MODE_LABEL: Record<ModeChoice, string> = { all: 'Любой', train: 'Поезд', bus: 'Автобус', plane: 'Самолёт' }

export function SearchScreen({ query, setQuery, onSearch, recent }: {
  query: Query
  setQuery: (q: Query) => void
  onSearch: (q: Query) => void
  recent: Query[]
}) {
  const { from, to } = query
  const set = (p: Partial<Query>) => setQuery({ ...query, ...p })
  const t = today()

  return (
    <main className="search">
      <p className="label"><Typed text="> куда отправляемся?" /></p>

      <h1 className="phrase">
        Я еду из{' '}
        <Popover label={from.nameFrom} wide>
          {(close) => <CityList exclude={to} onPick={(c) => (set({ from: c }), close())} />}
        </Popover>{' '}
        <button type="button" className="swap" title="Поменять местами" aria-label="Поменять города местами"
          onClick={() => set({ from: query.to, to: query.from })}>⇄</button>{' '}
        в{' '}
        <Popover label={to.nameTo} wide>
          {(close) => <CityList exclude={from} onPick={(c) => (set({ to: c }), close())} />}
        </Popover>{' '}
        <Popover label={whenPhrase(query.date)}>
          {(close) => (
            <>
              {[0, 1, 2].map((i) => (
                <button type="button" key={i} className="pop__item" onClick={() => (set({ date: addDays(t, i) }), close())}>
                  {['Сегодня', 'Завтра', 'Послезавтра'][i]}
                </button>
              ))}
              <label className="pop__date">
                Другой день
                <input type="date" min={t} value={query.date}
                  onChange={(e) => e.target.value >= t && (set({ date: e.target.value }), close())} />
              </label>
            </>
          )}
        </Popover>
        ,{' '}
        <Popover label={MODE_PHRASE[query.mode]}>
          {(close) =>
            MODES.map((m) => (
              <button type="button" key={m} className={`pop__item pop__item--icon ${m === query.mode ? 'is-on' : ''}`}
                onClick={() => (set({ mode: m }), close())}>
                <ModeIcon mode={m} /> {MODE_LABEL[m]}
              </button>
            ))
          }
        </Popover>
        .
      </h1>

      <button type="button" className="btn btn--primary btn--big" onClick={() => onSearch(query)}>
        Найти билеты <span aria-hidden="true">→</span>
      </button>

      {recent.length > 0 && (
        <section className="recent">
          <p className="label">Недавно искали</p>
          <div className="recent__list">
            {recent.map((r, i) => (
              <button type="button" key={i} className="btn btn--ghost"
                onClick={() => onSearch({ ...r, date: r.date < t ? t : r.date })}>
                {r.from.name} → {r.to.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
