import { useEffect, useState } from 'react'
import { buy } from '../core/buy'
import { labels, search, type SearchResult } from '../core/search'
import type { Trip } from '../core/types'
import { euro, whenPhrase } from './format'
import { Card, modesOf } from './ResultsScreen'
import type { Query } from './SearchScreen'
import { Typed } from './Typed'

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

/** «Туда и обратно»: два списка, самые дешёвые выбраны сразу, внизу — итог и две покупки. */
export function RoundTrip({ query, back, out, onOpen, onRetry }: {
  query: Query
  back: string
  out: SearchResult | null // «туда» ищет экран результатов — здесь только «обратно»
  onOpen: (t: Trip) => void
  onRetry: () => void
}) {
  const [ret, setRet] = useState<SearchResult | null>(null)
  const [a, setA] = useState<Trip | null>(null)
  const [b, setB] = useState<Trip | null>(null)

  useEffect(() => setA(out ? pickDefault(out.trips) : null), [out])
  useEffect(() => setB(ret ? pickDefault(ret.trips) : null), [ret])
  useEffect(() => {
    let live = true
    setRet(null)
    search(query.to, query.from, back, modesOf(query)).then((r) => live && setRet(r))
    return () => void (live = false)
  }, [query.from.key, query.to.key, back, query.mode, out])

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

      <Leg title={`Туда · ${whenPhrase(query.date)}`} res={out} chosen={a} onChoose={setA} onOpen={onOpen} />
      <Leg title={`Обратно · ${whenPhrase(back)}`} res={ret} chosen={b} onChoose={setB} onOpen={onOpen} />

      {(a || b) && (
        <div className="total" role="region" aria-label="Итого">
          <span className="total__sum">
            Итого {a ? euro(a.price) : '—'} + {b ? euro(b.price) : '—'}
            {sum != null && <> = <b>{euro(sum)}</b></>}
          </span>
          <span className="total__buy">
            <button type="button" className="btn btn--primary" disabled={!a} onClick={() => a && buy(a)}>Купить туда</button>
            <button type="button" className="btn btn--primary" disabled={!b} onClick={() => b && buy(b)}>Купить обратно</button>
          </span>
        </div>
      )}
    </>
  )
}
