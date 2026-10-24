import { useEffect, useState } from 'react'
import { findCities } from '../core/cities'
import { searchPlaces } from '../core/places'
import { addDays } from '../core/search'
import type { City } from '../core/types'
import { today } from './format'
import { useT, type ModeChoice } from './i18n'
import { ModeIcon } from './Icons'
import { DatePicker } from './DatePicker'
import { Popover } from './Popover'
import { Typed } from './Typed'

export type { ModeChoice }
export interface Query {
  from: City
  to: City
  date: string
  dateTo?: string | null // конец периода «туда»: ищем самый дешёвый день с date по dateTo
  back?: string | null // дата обратного билета (или начало периода); нет — только туда
  backTo?: string | null // конец периода «обратно»
  mode: ModeChoice
}

function CityList({ exclude, onPick }: { exclude: City; onPick: (c: City) => void }) {
  const t = useT()
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
        placeholder={t.cityPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && list[0] && onPick(list[0])}
      />
      <span className="pop__list">
        {list.map((c) => (
          <button type="button" key={c.key} className="pop__item" onClick={() => onPick(c)}>
            {t.cityName(c)}
            <small>{c.region ?? (c.it !== t.cityName(c) ? c.it : '')}</small>
          </button>
        ))}
        {busy && <span className="pop__empty">{t.cityLooking}</span>}
        {!busy && !list.length && <span className="pop__empty">{t.cityNone}</span>}
      </span>
    </>
  )
}

const MODES: ModeChoice[] = ['all', 'train', 'bus', 'plane']

export function SearchScreen({ query, setQuery, onSearch, recent }: {
  query: Query
  setQuery: (q: Query) => void
  onSearch: (q: Query) => void
  recent: Query[]
}) {
  const t = useT()
  const { from, to } = query
  const set = (p: Partial<Query>) => setQuery({ ...query, ...p })
  const t0 = today()

  return (
    <main className="search">
      <p className="label"><Typed text={t.prompt} /></p>

      <h1 className="phrase">
        {t.iGo}{' '}
        <Popover label={t.cityFrom(from)} wide>
          {(close) => <CityList exclude={to} onPick={(c) => (set({ from: c }), close())} />}
        </Popover>{' '}
        <button type="button" className="swap" title={t.swap} aria-label={t.swap}
          onClick={() => set({ from: query.to, to: query.from })}>⇄</button>{' '}
        {t.to}{' '}
        <Popover label={t.cityTo(to)} wide>
          {(close) => <CityList exclude={from} onPick={(c) => (set({ to: c }), close())} />}
        </Popover>{' '}
        <Popover label={query.dateTo ? t.range(query.date, query.dateTo) : t.when(query.date)} center>
          {(close) => (
            <DatePicker value={query.date} to={query.dateTo}
              onPick={(date, dateTo) => {
                // обратно не раньше, чем закончится «туда»
                const ok = query.back && query.back >= (dateTo ?? date)
                set({ date, dateTo, back: ok ? query.back : null, backTo: ok ? query.backTo : null })
                close()
              }} />
          )}
        </Popover>
        ,{' '}
        <Popover label={!query.back ? t.oneWay : t.back(query.backTo ? t.range(query.back, query.backTo) : t.when(query.back))} center>
          {(close) => (
            <>
              <button type="button" className={`btn btn--ghost cal__oneway ${query.back ? '' : 'is-on'}`}
                onClick={() => (set({ back: null, backTo: null }), close())}>
                {t.onlyThere}
              </button>
              <p className="label cal__hint">{t.backHint}</p>
              <DatePicker value={query.back ?? query.dateTo ?? query.date} to={query.backTo} min={query.dateTo ?? query.date} quick={false}
                onPick={(back, backTo) => (set({ back, backTo }), close())} />
            </>
          )}
        </Popover>
        ,{' '}
        <Popover label={t.modePhrase[query.mode]}>
          {(close) =>
            MODES.map((m) => (
              <button type="button" key={m} className={`pop__item pop__item--icon ${m === query.mode ? 'is-on' : ''}`}
                onClick={() => (set({ mode: m }), close())}>
                <ModeIcon mode={m} /> {t.modeLabel[m]}
              </button>
            ))
          }
        </Popover>
        .
      </h1>

      <button type="button" className="btn btn--primary btn--big" onClick={() => onSearch(query)}>
        {t.find} <span aria-hidden="true">→</span>
      </button>
      {!query.dateTo && <p className="tip">{t.periodTip}</p>}

      {recent.length > 0 && (
        <section className="recent">
          <p className="label">{t.recent}</p>
          <div className="recent__list">
            {recent.map((r, i) => (
              <button type="button" key={i} className="btn btn--ghost"
                onClick={() => onSearch({ ...r, date: r.date < t0 ? t0 : r.date })}>
                {t.cityName(r.from)} → {t.cityName(r.to)}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
