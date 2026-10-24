import { useEffect, useRef, useState } from 'react'
import { buy } from '../core/buy'
import { labels, search, type SearchResult } from '../core/search'
import type { Trip } from '../core/types'
import { hhmm } from './format'
import { useT } from './i18n'
import { ModeIcon } from './Icons'
import { Card, Horizon, modesOf } from './ResultsScreen'
import type { Query } from './SearchScreen'
import { Typed } from './Typed'
import { cheapestDay, daysBetween, useDayPrices } from './useDayPrices'

const SHOW = 8

/** Что выбрано сразу: самый дешёвый, а если цен нет совсем — первый по времени. */
export const pickDefault = (trips: Trip[]) => labels(trips).cheapest ?? trips[0] ?? null

export const total = (a: Trip | null, b: Trip | null) =>
  a?.price != null && b?.price != null ? Math.round((a.price + b.price) * 100) / 100 : null

function Leg({ title, res, chosen, onChoose, onOpen }: {
  title: string
  res: SearchResult | null
  chosen: Trip | null
  onChoose: (t: Trip) => void
  onOpen: (t: Trip) => void
}) {
  const t = useT()
  const [all, setAll] = useState(false)
  if (!res) return (
    <section className="cards">
      <p className="label">{title}</p>
      <div className="ghost-card" />
    </section>
  )
  const l = labels(res.trips)
  const tags = (x: Trip) => [x === l.cheapest && t.tagCheapest, x === l.fastest && t.tagFastest].filter(Boolean) as string[]
  const list = all ? res.trips : res.trips.slice(0, SHOW)
  return (
    <section className="cards">
      <p className="label">{title} · {res.trips.length}</p>
      {res.failed.map((f) => <p key={f} className="notice">{t.carrierDown(f)}</p>)}
      {res.trips.length === 0 && <p className="notice">{t.noneThisDay}</p>}
      {list.map((x, i) => (
        <Card key={i} trip={x} tags={tags(x)} selected={x === chosen} onSelect={() => onChoose(x)} onOpen={() => onOpen(x)} />
      ))}
      {!all && res.trips.length > SHOW && (
        <button type="button" className="btn btn--ghost btn--big" onClick={() => setAll(true)}>
          {t.more(res.trips.length - SHOW)}
        </button>
      )}
    </section>
  )
}

/** Строка итога: за что именно эта сумма — день, время, транспорт, перевозчик — и её покупка. */
function TotalRow({ label, date, trip }: { label: string; date: string; trip: Trip | null }) {
  const t = useT()
  return (
    <div className="total__row">
      <span className="total__leg">{label}</span>
      {trip ? (
        <>
          <span className="total__what">
            <ModeIcon mode={trip.mode} size={20} />
            <span>
              <b>{t.weekday(date)}, {t.dayMonth(date)} · {hhmm(trip.depart)} → {hhmm(trip.arrive)}{trip.arrive.slice(0, 10) > trip.depart.slice(0, 10) && ` (${t.nextDay})`}</b>
              <small>{t.modeName[trip.mode]} {trip.provider} · {t.place(trip.from)} → {t.place(trip.to)}</small>
            </span>
          </span>
          <span className="total__price">{t.euro(trip.price)}</span>
          <button type="button" className="btn btn--primary" onClick={() => buy(trip)}>{t.buy}</button>
        </>
      ) : (
        <span className="total__what">{t.pickTrip}</span>
      )}
    </div>
  )
}

/** «Туда и обратно»: два списка, самые дешёвые выбраны сразу, внизу — итог и две покупки. */
export function RoundTrip({ query, outDate, back, out, onOpen, onRetry }: {
  query: Query
  outDate: string // выбранный день «туда» (в периоде — самый дешёвый или выбранный)
  back: string
  out: SearchResult | null // «туда» ищет экран результатов — здесь только «обратно»
  onOpen: (t: Trip) => void
  onRetry: () => void
}) {
  const t = useT()
  const [ret, setRet] = useState<SearchResult | null>(null)
  const [a, setA] = useState<Trip | null>(null)
  const [b, setB] = useState<Trip | null>(null)
  // обратно: один день или период — тогда перебираем дни и берём самый дешёвый
  const period = !!query.backTo
  const [backDay, setBackDay] = useState(back)
  const picked = useRef(false)
  const backDays = useDayPrices(query.to, query.from, back, period ? daysBetween(back, query.backTo!).length : 0, modesOf(query))
  useEffect(() => {
    picked.current = false
    setBackDay(back)
  }, [back, query.backTo, query.from.key, query.to.key, query.mode])
  useEffect(() => {
    const c = cheapestDay(backDays.days)
    if (period && backDays.done && !picked.current && c) setBackDay(c.date)
  }, [backDays.done])

  useEffect(() => setA(out ? pickDefault(out.trips) : null), [out])
  useEffect(() => setB(ret ? pickDefault(ret.trips) : null), [ret])
  useEffect(() => {
    let live = true
    setRet(null)
    search(query.to, query.from, backDay, modesOf(query)).then((r) => live && setRet(r))
    return () => void (live = false)
  }, [query.from.key, query.to.key, backDay, query.mode, out])

  const sum = total(a, b)
  const cheapest = total(out && pickDefault(out.trips), ret && pickDefault(ret.trips))
  const nothing = out && ret && (!out.trips.length || !ret.trips.length)

  return (
    <>
      <section className="answer">
        {!out || !ret ? (
          <p className="label"><Typed text={t.contacting} /></p>
        ) : (
          <p className="answer__text">
            {cheapest != null ? (
              <>{t.rtCheapest} <span className="on">{t.euro(cheapest)}</span>.</>
            ) : nothing ? (
              <><span className="on">{t.rtNone[0]}</span> {t.rtNone[1]}</>
            ) : (
              <>{t.rtPick}</>
            )}
          </p>
        )}
        {nothing && (out!.failed.length > 0 || ret!.failed.length > 0) && (
          <button type="button" className="btn btn--primary btn--big" onClick={onRetry}>{t.retry}</button>
        )}
      </section>

      <Leg title={`${t.there} · ${t.when(outDate)}`} res={out} chosen={a} onChoose={setA} onOpen={onOpen} />
      {period && (
        <>
          <p className="period">
            {!backDays.done ? (
              <Typed text={t.scanningBack(backDays.days.filter((d) => !d.loading).length, backDays.days.length)} />
            ) : cheapestDay(backDays.days) ? (
              <>{t.cheapestDayBack} <b>{t.when(cheapestDay(backDays.days)!.date)}</b>, {t.from} <b>{t.euro(cheapestDay(backDays.days)!.min)}</b>.</>
            ) : (
              <>{t.periodNoneBack}</>
            )}
          </p>
          <Horizon days={backDays.days} date={backDay} onPick={(d) => ((picked.current = true), setBackDay(d))} />
        </>
      )}
      <Leg title={`${t.backTitle} · ${t.when(backDay)}`} res={ret} chosen={b} onChoose={setB} onOpen={onOpen} />

      {(a || b) && (
        <div className="total" role="region" aria-label={t.total}>
          <TotalRow label={t.there} date={outDate} trip={a} />
          <TotalRow label={t.backTitle} date={backDay} trip={b} />
          <p className="total__sum">
            {t.total} <b>{sum != null ? t.euro(sum) : '—'}</b>
          </p>
        </div>
      )}
    </>
  )
}
