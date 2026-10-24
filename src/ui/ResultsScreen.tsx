import { useEffect, useRef, useState } from 'react'
import { buy } from '../core/buy'
import { addDays, labels, search, type DayPrice, type SearchResult } from '../core/search'
import type { Mode, Trip } from '../core/types'
import { hhmm, today } from './format'
import { tripDurT, useT } from './i18n'
import { ModeIcon } from './Icons'
import type { Query } from './SearchScreen'
import { RoundTrip } from './RoundTrip'
import { hubWait, searchVia } from '../core/hubs'
import { Compare } from './Compare'
import { loyaltyCode, loyaltyRejected } from '../core/loyalty'
import { Typed } from './Typed'
import { cheapestDay, daysBetween, useDayPrices } from './useDayPrices'

export const modesOf = (q: Query): Mode[] => (q.mode === 'all' ? ['train', 'bus', 'plane'] : [q.mode])
const SHOW = 12

/** Карточка рейса. С onSelect — режим «туда и обратно»: нажатие выбирает рейс,
 *  а покупка — в плашке «Итого»; подробности — отдельной кнопкой. */
export function Card({ trip, tags, onOpen, selected, onSelect }: {
  trip: Trip
  tags?: string[]
  onOpen: () => void
  selected?: boolean
  onSelect?: () => void
}) {
  const t = useT()
  const act = onSelect ?? onOpen
  return (
    <article className={`card ${selected ? 'card--on' : ''}`} tabIndex={0} onClick={act}
      onKeyDown={(e) => e.key === 'Enter' && act()} aria-pressed={onSelect ? !!selected : undefined}>
      {((tags && tags.length > 0) || trip.via) && (
        <div className="card__tags">
          {tags?.map((x) => <span key={x} className="tag">{x}</span>)}
          {trip.via && <span className="tag tag--two">{t.viaTag(trip.via)}</span>}
        </div>
      )}
      <div className="card__row">
        {onSelect && <span className="card__radio" aria-hidden="true" />}
        <span className="card__mode" title={t.modeName[trip.mode]}><ModeIcon mode={trip.mode} size={26} /></span>
        <span className="card__times">
          <b>{hhmm(trip.depart)}</b>
          <span className="card__line" aria-hidden="true" />
          <b>{hhmm(trip.arrive)}{trip.arrive.slice(0, 10) > trip.depart.slice(0, 10) && <sup className="next-day"> {t.nextDay}</sup>}</b>
        </span>
        <span className="card__price">{t.euro(trip.price)}</span>
      </div>
      <div className="card__row card__row--meta">
        <span>
          {trip.vehicles.join(' + ')} · {tripDurT(t, trip)} · {t.changes(trip.changes)}
          <br />
          <small>{t.place(trip.from)} → {t.place(trip.to)}</small>
          {trip.via && <><br /><small className="card__wait">{t.waitIn(trip.via, t.dur(hubWait(trip)))}</small></>}
        </span>
        {onSelect || trip.parts ? (
          <button type="button" className={`btn ${trip.parts && !onSelect ? 'btn--primary' : 'btn--ghost'}`} onClick={(e) => (e.stopPropagation(), onOpen())}>
            {t.details}
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={(e) => (e.stopPropagation(), buy(trip))}>
            {t.buyOn(trip.provider)}
          </button>
        )}
      </div>
    </article>
  )
}

export function Horizon({ days, date, onPick }: { days: DayPrice[]; date: string; onPick: (d: string) => void }) {
  const t = useT()
  const prices = days.map((d) => d.min).filter((p): p is number => p != null)
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const ref = useRef<HTMLElement>(null)
  // выбранный день всегда на виду — в периоде он может оказаться за краем линии
  useEffect(() => {
    // только вбок, внутри линии: scrollIntoView двигал бы и саму страницу
    const nav = ref.current
    const el = nav?.querySelector<HTMLElement>('.day--on')
    if (nav && el) nav.scrollTo({ left: el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [date])
  return (
    <nav className="horizon" aria-label={t.pricesByDay} ref={ref}>
      {days.map((d) => {
        const cheap = d.min != null && d.min === lo && prices.length > 1
        // чем дешевле день, тем выше точка над линией — горизонт цен
        const lift = d.min == null || hi === lo ? 0 : 1 - (d.min - lo) / (hi - lo)
        return (
          <button type="button" key={d.date}
            className={`day ${d.date === date ? 'day--on' : ''} ${cheap ? 'day--cheap' : ''} ${d.loading ? 'day--wait' : ''}`}
            onClick={() => onPick(d.date)} aria-current={d.date === date}>
            <span className="day__price">{d.loading ? '···' : d.min == null ? t.noPrice : t.euro(d.min)}</span>
            <span className="day__dot" style={{ transform: `translateY(${-lift * 14}px)` }} />
            <span className="day__name">{t.weekday(d.date)}, {Number(d.date.slice(8))}</span>
            {cheap && <span className="day__hint">{t.cheapestHint}</span>}
          </button>
        )
      })}
    </nav>
  )
}

/** Строка о карте X-GO: цены участника или «номер не приняли». */
export function CardNotice() {
  const t = useT()
  if (!loyaltyCode()) return null
  return <p className={`notice ${loyaltyRejected() ? '' : 'notice--ok'}`}>{loyaltyRejected() ? t.cardRejected : t.cardOn}</p>
}

export function ResultsScreen({ query, onBack, onDate, onOpen }: {
  query: Query
  onBack: () => void
  onDate: (date: string) => void
  onOpen: (t: Trip) => void
}) {
  const t = useT()
  const { from, to } = query
  const period = !!query.dateTo
  const [res, setRes] = useState<SearchResult | null>(null)
  const [all, setAll] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // день, рейсы которого показываем: без периода — дата поиска, в периоде — выбранный или самый дешёвый
  const [day, setDay] = useState(query.date)
  const picked = useRef(false)
  const t0 = today()
  const modes = modesOf(query)
  const first = period ? query.date : addDays(query.date, -3) < t0 ? t0 : addDays(query.date, -3)
  const count = period ? daysBetween(query.date, query.dateTo!).length : 7
  const { days, done } = useDayPrices(from, to, first, count, modes, period)

  useEffect(() => {
    picked.current = false
    setDay(query.date)
  }, [from.key, to.key, query.date, query.dateTo, query.mode])

  // перебор периода закончен — показываем самый дешёвый день, если человек не выбрал свой
  useEffect(() => {
    const c = cheapestDay(days)
    if (period && done && !picked.current && c) setDay(c.date)
  }, [done])

  useEffect(() => {
    let live = true
    setRes(null)
    setAll(false)
    // по периоду — ещё и поездки из двух билетов через пересадочный узел
    ;(period ? searchVia : search)(from, to, day, modes).then((r) => live && setRes(r))
    return () => void (live = false)
  }, [from.key, to.key, day, query.mode, attempt])

  const pickDay = (d: string) => (period ? ((picked.current = true), setDay(d)) : onDate(d))
  const checked = days.filter((d) => !d.loading).length
  const best = cheapestDay(days)

  const l = res ? labels(res.trips) : {}
  const picks = new Map<Trip, string[]>()
  for (const [k, name] of [['cheapest', t.tagCheapest], ['fastest', t.tagFastest], ['best', t.tagBest]] as const) {
    const x = l[k]
    if (x) picks.set(x, [...(picks.get(x) ?? []), name])
  }
  const better = days.filter((d) => d.min != null && l.cheapest?.price != null && d.min < l.cheapest.price && d.date !== day)
    .sort((a, b) => a.min! - b.min!)[0]
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <main className="results">
      <header className="bar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>{t.editSearch}</button>
        <span className="bar__route">
          {t.cityName(from)} → {t.cityName(to)} · {period ? t.range(query.date, query.dateTo!) : t.when(query.date)}
          {query.back && t.routeBack(query.backTo ? t.range(query.back, query.backTo) : t.when(query.back))}
        </span>
      </header>

      {period && (
        <p className="period">
          {!done ? (
            <Typed text={t.scanning(checked, count)} />
          ) : best ? (
            <>{t.cheapestDayThere} <b>{t.when(best.date)}</b>, {t.from} <b>{t.euro(best.min)}</b>. {t.pickOtherDay}</>
          ) : (
            <>{t.periodNone}</>
          )}
        </p>
      )}
      <Horizon days={days} date={day} onPick={pickDay} />

      {query.back && <RoundTrip query={query} outDate={day} back={query.back} out={res} onOpen={onOpen} onRetry={() => setAttempt(attempt + 1)} />}

      {!query.back && !res && (
        <section className="answer answer--wait">
          <p className="label"><Typed text={t.contacting} /></p>
          <div className="ghost-card" /><div className="ghost-card" />
        </section>
      )}

      {!query.back && res && res.trips.length === 0 && (
        <section className="answer">
          <p className="answer__text">
            {res.failed.length && offline ? (
              <><span className="on">{t.offline[0]}</span> {t.offline[1]}</>
            ) : res.failed.length ? (
              <><span className="on">{t.down[0]}</span> {t.down[1]}</>
            ) : (
              <><span className="on">{t.noneDay[0]}</span> {t.noneDay[1]}</>
            )}
          </p>
          {res.failed.length > 0 && (
            <button type="button" className="btn btn--primary btn--big" onClick={() => setAttempt(attempt + 1)}>{t.retry}</button>
          )}
        </section>
      )}

      {!query.back && res && res.trips.length > 0 && (
        <>
          <section className="answer">
            <p className="answer__text">
              {l.cheapest && (
                <>{t.cheapestIs} <span className="on">{t.modeBy[l.cheapest.mode]}, {t.euro(l.cheapest.price)}</span>
                  {' '}{t.at} {hhmm(l.cheapest.depart)}. </>
              )}
              {l.fastest && l.fastest !== l.cheapest && (
                <>{t.fastestIs} <span className="on">{t.modeBy[l.fastest.mode]}, {tripDurT(t, l.fastest)}</span>. </>
              )}
              {better && (
                <>{t.andOn(t.when(better.date))} <span className="on">{t.from} {t.euro(better.min)}</span>.</>
              )}
            </p>
            {res.failed.map((f) => (
              <p key={f} className="notice">{t.carrierDown(f)}</p>
            ))}
            <CardNotice />
          </section>

          <Compare trips={res.trips} onOpen={onOpen} />

          <section className="cards">
            {[...picks].map(([x, tags]) => <Card key={'p' + x.depart + x.vehicles} trip={x} tags={tags} onOpen={() => onOpen(x)} />)}
          </section>

          <section className="cards">
            <p className="label">{t.all(res.trips.length)}</p>
            {(all ? res.trips : res.trips.slice(0, SHOW)).map((x, i) => <Card key={i} trip={x} onOpen={() => onOpen(x)} />)}
            {!all && res.trips.length > SHOW && (
              <button type="button" className="btn btn--ghost btn--big" onClick={() => setAll(true)}>
                {t.more(res.trips.length - SHOW)}
              </button>
            )}
          </section>
        </>
      )}

      {!query.back && <p className="signal" aria-live="polite">
        {t.signal} · {res ? `${res.asked.length - res.failed.length} ${t.of} ${res.asked.length}` : <span>{t.waiting}</span>}
      </p>}
    </main>
  )
}
