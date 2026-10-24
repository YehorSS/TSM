import { useState } from 'react'
import { cityByKey, findCities } from '../core/cities'
import { addDays } from '../core/search'
import type { City } from '../core/types'
import { MODE_PHRASE, today, whenPhrase } from './format'
import { ModeIcon } from './Icons'
import { Popover } from './Popover'
import { Typed } from './Typed'

export type ModeChoice = 'all' | 'train' | 'bus' | 'plane'
export interface Query {
  from: string // key города
  to: string
  date: string
  mode: ModeChoice
}

function CityList({ exclude, onPick }: { exclude: string; onPick: (c: City) => void }) {
  const [q, setQ] = useState('')
  const list = findCities(q).filter((c) => c.key !== exclude)
  return (
    <>
      <input
        className="pop__input"
        autoFocus
        placeholder="Начните писать город…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && list[0] && onPick(list[0])}
      />
      <span className="pop__list">
        {list.map((c) => (
          <button type="button" key={c.key} className="pop__item" onClick={() => onPick(c)}>
            {c.name}
            <small>{c.it}</small>
          </button>
        ))}
        {!list.length && <span className="pop__empty">Такого города пока нет в списке</span>}
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
  const from = cityByKey(query.from)!
  const to = cityByKey(query.to)!
  const set = (p: Partial<Query>) => setQuery({ ...query, ...p })
  const t = today()

  return (
    <main className="search">
      <p className="label"><Typed text="> куда отправляемся?" /></p>

      <h1 className="phrase">
        Я еду из{' '}
        <Popover label={from.nameFrom} wide>
          {(close) => <CityList exclude={query.to} onPick={(c) => (set({ from: c.key }), close())} />}
        </Popover>{' '}
        <button type="button" className="swap" title="Поменять местами" aria-label="Поменять города местами"
          onClick={() => set({ from: query.to, to: query.from })}>⇄</button>{' '}
        в{' '}
        <Popover label={to.nameTo} wide>
          {(close) => <CityList exclude={query.from} onPick={(c) => (set({ to: c.key }), close())} />}
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
                {cityByKey(r.from)?.name} → {cityByKey(r.to)?.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
