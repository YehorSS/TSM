import { useEffect, useState } from 'react'
import { buy } from '../core/buy'
import { addDays, labels, priceDays, search, type DayPrice, type SearchResult } from '../core/search'
import type { Mode, Trip } from '../core/types'
import { changesText, dayMonth, euro, hhmm, MODE_BY, MODE_NAME, today, tripDur, weekday, whenPhrase } from './format'
import { ModeIcon } from './Icons'
import type { Query } from './SearchScreen'
import { Typed } from './Typed'

export const modesOf = (q: Query): Mode[] => (q.mode === 'all' ? ['train', 'bus', 'plane'] : [q.mode])
const SHOW = 12

function Card({ trip, tags, onOpen }: { trip: Trip; tags?: string[]; onOpen: () => void }) {
  return (
    <article className="card" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      {tags && <div className="card__tags">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
      <div className="card__row">
        <span className="card__mode" title={MODE_NAME[trip.mode]}><ModeIcon mode={trip.mode} size={26} /></span>
        <span className="card__times">
          <b>{hhmm(trip.depart)}</b>
          <span className="card__line" aria-hidden="true" />
          <b>{hhmm(trip.arrive)}{trip.arrive.slice(0, 10) > trip.depart.slice(0, 10) && <sup className="next-day"> +1 день</sup>}</b>
        </span>
        <span className="card__price">{euro(trip.price)}</span>
      </div>
      <div className="card__row card__row--meta">
        <span>
          {trip.vehicles.join(' + ')} · {tripDur(trip)} · {changesText(trip.changes)}
          <br />
          <small>{trip.from} → {trip.to}</small>
        </span>
        <button type="button" className="btn btn--primary"
          onClick={(e) => (e.stopPropagation(), buy(trip))}>
          Купить на сайте {trip.provider}
        </button>
      </div>
    </article>
  )
}

function Horizon({ days, date, onPick }: { days: DayPrice[]; date: string; onPick: (d: string) => void }) {
  const prices = days.map((d) => d.min).filter((p): p is number => p != null)
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return (
    <nav className="horizon" aria-label="Цены по дням">
      <span className="horizon__line" aria-hidden="true" />
      {days.map((d) => {
        const cheap = d.min != null && d.min === lo && prices.length > 1
        // чем дешевле день, тем выше точка над линией — горизонт цен
        const lift = d.min == null || hi === lo ? 0 : 1 - (d.min - lo) / (hi - lo)
        return (
          <button type="button" key={d.date}
            className={`day ${d.date === date ? 'day--on' : ''} ${cheap ? 'day--cheap' : ''} ${d.loading ? 'day--wait' : ''}`}
            onClick={() => onPick(d.date)} aria-current={d.date === date}>
            <span className="day__price">{d.loading ? '···' : d.min == null ? 'нет' : euro(d.min)}</span>
            <span className="day__dot" style={{ transform: `translateY(${-lift * 14}px)` }} />
            <span className="day__name">{weekday(d.date)}, {dayMonth(d.date).split(' ')[0]}</span>
            {cheap && <span className="day__hint">дешевле всего</span>}
          </button>
        )
      })}
    </nav>
  )
}

export function ResultsScreen({ query, onBack, onDate, onOpen }: {
  query: Query
  onBack: () => void
  onDate: (date: string) => void
  onOpen: (t: Trip) => void
}) {
  const { from, to } = query
  const [res, setRes] = useState<SearchResult | null>(null)
  const [days, setDays] = useState<DayPrice[]>([])
  const [all, setAll] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const t0 = today()
  const start = addDays(query.date, -3) < t0 ? t0 : addDays(query.date, -3)
  const modes = modesOf(query)

  useEffect(() => {
    let live = true
    setRes(null)
    setAll(false)
    search(from, to, query.date, modes).then((r) => live && setRes(r))
    return () => void (live = false)
  }, [from.key, to.key, query.date, query.mode, attempt])

  useEffect(() => {
    let live = true
    // заготовка горизонта сразу, цены приходят по дню
    setDays(Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), min: null, loading: true })))
    priceDays(from, to, start, modes, 7, undefined, (d) =>
      live && setDays((list) => list.map((x) => (x.date === d.date ? d : x))),
    ).catch(() => {})
    return () => void (live = false)
  }, [from.key, to.key, start, query.mode])

  const l = res ? labels(res.trips) : {}
  const picks = new Map<Trip, string[]>()
  for (const [k, name] of [['cheapest', 'Самый дешёвый'], ['fastest', 'Самый быстрый'], ['best', 'Лучший по цене и времени']] as const) {
    const t = l[k]
    if (t) picks.set(t, [...(picks.get(t) ?? []), name])
  }
  const better = days.filter((d) => d.min != null && l.cheapest?.price != null && d.min < l.cheapest.price && d.date !== query.date)
    .sort((a, b) => a.min! - b.min!)[0]
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <main className="results">
      <header className="bar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>← Изменить поиск</button>
        <span className="bar__route">{from.name} → {to.name} · {whenPhrase(query.date)}</span>
      </header>

      <Horizon days={days} date={query.date} onPick={onDate} />

      {!res && (
        <section className="answer answer--wait">
          <p className="label"><Typed text="> связываюсь с перевозчиками…" /></p>
          <div className="ghost-card" /><div className="ghost-card" />
        </section>
      )}

      {res && res.trips.length === 0 && (
        <section className="answer">
          <p className="answer__text">
            {res.failed.length && offline ? (
              <><span className="on">Нет связи с интернетом.</span> Проверьте Wi-Fi и попробуйте снова.</>
            ) : res.failed.length ? (
              <><span className="on">Перевозчики сейчас не отвечают.</span> Попробуйте через минуту.</>
            ) : (
              <><span className="on">На этот день вариантов нет.</span> Выберите соседний день на линии выше.</>
            )}
          </p>
          {res.failed.length > 0 && (
            <button type="button" className="btn btn--primary btn--big" onClick={() => setAttempt(attempt + 1)}>Попробовать снова</button>
          )}
        </section>
      )}

      {res && res.trips.length > 0 && (
        <>
          <section className="answer">
            <p className="answer__text">
              {l.cheapest && (
                <>Дешевле всего — <span className="on">{MODE_BY[l.cheapest.mode]}, за {euro(l.cheapest.price)}</span>
                  {' '}в {hhmm(l.cheapest.depart)}. </>
              )}
              {l.fastest && l.fastest !== l.cheapest && (
                <>Быстрее всего — <span className="on">{MODE_BY[l.fastest.mode]}, {tripDur(l.fastest)}</span>. </>
              )}
              {better && (
                <>А {whenPhrase(better.date)} — <span className="on">от {euro(better.min)}</span>.</>
              )}
            </p>
            {res.failed.map((f) => (
              <p key={f} className="notice">{f} сейчас не отвечает — показываю остальных.</p>
            ))}
          </section>

          <section className="cards">
            {[...picks].map(([t, tags]) => <Card key={'p' + t.depart + t.vehicles} trip={t} tags={tags} onOpen={() => onOpen(t)} />)}
          </section>

          <section className="cards">
            <p className="label">Все варианты · {res.trips.length}</p>
            {(all ? res.trips : res.trips.slice(0, SHOW)).map((t, i) => <Card key={i} trip={t} onOpen={() => onOpen(t)} />)}
            {!all && res.trips.length > SHOW && (
              <button type="button" className="btn btn--ghost btn--big" onClick={() => setAll(true)}>
                Показать ещё {res.trips.length - SHOW}
              </button>
            )}
          </section>
        </>
      )}

      <p className="signal" aria-live="polite">
        ПРИЁМ · {res ? `${res.asked.length - res.failed.length} из ${res.asked.length}` : <span>ожидание</span>}
      </p>
    </main>
  )
}
