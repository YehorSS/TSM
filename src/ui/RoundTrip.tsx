import { useEffect, useRef, useState } from 'react'
import { buy } from '../core/buy'
import { labels, search, type SearchResult } from '../core/search'
import type { Trip } from '../core/types'
import { dayMonth, euro, hhmm, MODE_NAME, weekday, whenPhrase } from './format'
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
  const [all, setAll] = useState(false)
  if (!res) return (
    <section className="cards">
      <p className="label">{title}</p>
      <div className="ghost-card" />
    </section>
  )
  const l = labels(res.trips)
  const tags = (t: Trip) => [t === l.cheapest && 'Самый дешёвый', t === l.fastest && 'Самый быстрый'].filter(Boolean) as string[]
  const list = all ? res.trips : res.trips.slice(0, SHOW)
  return (
    <section className="cards">
      <p className="label">{title} · {res.trips.length}</p>
      {res.failed.map((f) => <p key={f} className="notice">{f} сейчас не отвечает — показываю остальных.</p>)}
      {res.trips.length === 0 && <p className="notice">На этот день вариантов нет — выберите другой день.</p>}
      {list.map((t, i) => (
        <Card key={i} trip={t} tags={tags(t)} selected={t === chosen} onSelect={() => onChoose(t)} onOpen={() => onOpen(t)} />
      ))}
      {!all && res.trips.length > SHOW && (
        <button type="button" className="btn btn--ghost btn--big" onClick={() => setAll(true)}>
          Показать ещё {res.trips.length - SHOW}
        </button>
      )}
    </section>
  )
}

/** Строка итога: за что именно эта сумма — день, время, транспорт, перевозчик — и её покупка. */
function TotalRow({ label, date, trip }: { label: string; date: string; trip: Trip | null }) {
  return (
    <div className="total__row">
      <span className="total__leg">{label}</span>
      {trip ? (
        <>
          <span className="total__what">
            <ModeIcon mode={trip.mode} size={20} />
            <span>
              <b>{weekday(date)}, {dayMonth(date)} · {hhmm(trip.depart)} → {hhmm(trip.arrive)}{trip.arrive.slice(0, 10) > trip.depart.slice(0, 10) && ' (+1 день)'}</b>
              <small>{MODE_NAME[trip.mode].toLowerCase()} {trip.provider} · {trip.from} → {trip.to}</small>
            </span>
          </span>
          <span className="total__price">{euro(trip.price)}</span>
          <button type="button" className="btn btn--primary" onClick={() => buy(trip)}>Купить</button>
        </>
      ) : (
        <span className="total__what">выберите рейс в списке</span>
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
          <p className="label"><Typed text="> связываюсь с перевозчиками…" /></p>
        ) : (
          <p className="answer__text">
            {cheapest != null ? (
              <>Туда и обратно дешевле всего — <span className="on">{euro(cheapest)}</span>.</>
            ) : nothing ? (
              <><span className="on">В один из дней вариантов нет.</span> Попробуйте другие даты.</>
            ) : (
              <>Выберите рейс туда и обратно.</>
            )}
          </p>
        )}
        {nothing && (out!.failed.length > 0 || ret!.failed.length > 0) && (
          <button type="button" className="btn btn--primary btn--big" onClick={onRetry}>Попробовать снова</button>
        )}
      </section>

      <Leg title={`Туда · ${whenPhrase(outDate)}`} res={out} chosen={a} onChoose={setA} onOpen={onOpen} />
      {period && (
        <>
          <p className="period">
            {!backDays.done ? (
              <Typed text={`> обратно: проверяю каждый день, ${backDays.days.filter((d) => !d.loading).length} из ${backDays.days.length}…`} />
            ) : cheapestDay(backDays.days) ? (
              <>Самый дешёвый день обратно — <b>{whenPhrase(cheapestDay(backDays.days)!.date)}</b>, от <b>{euro(cheapestDay(backDays.days)!.min)}</b>.</>
            ) : (
              <>Обратно в этот период вариантов не нашлось.</>
            )}
          </p>
          <Horizon days={backDays.days} date={backDay} onPick={(d) => ((picked.current = true), setBackDay(d))} />
        </>
      )}
      <Leg title={`Обратно · ${whenPhrase(backDay)}`} res={ret} chosen={b} onChoose={setB} onOpen={onOpen} />

      {(a || b) && (
        <div className="total" role="region" aria-label="Итого">
          <TotalRow label="Туда" date={outDate} trip={a} />
          <TotalRow label="Обратно" date={backDay} trip={b} />
          <p className="total__sum">
            Итого <b>{sum != null ? euro(sum) : '—'}</b>
          </p>
        </div>
      )}
    </>
  )
}
