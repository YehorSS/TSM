import { compareKinds, diff, passBeats } from '../core/compare'
import { minutes } from '../core/search'
import type { Trip } from '../core/types'
import { useT } from './i18n'
import { ModeIcon } from './Icons'

/** Сравнение по виду транспорта: самый дешёвый вариант каждого вида, его время в пути
 *  и насколько он дороже и быстрее самого дешёвого из всех. Нажатие — подробности поездки. */
export function Compare({ trips, onOpen }: { trips: Trip[]; onOpen: (t: Trip) => void }) {
  const t = useT()
  const rows = compareKinds(trips.filter((x) => x.price != null))
  if (rows.length < 2) return null // сравнивать нечего
  const base = rows[0].trip

  return (
    <section className="compare">
      <p className="label">{t.compareTitle}</p>
      {rows.map((r) => {
        const d = diff(r.trip, base)
        const time = d.min < 0 ? t.faster(t.dur(-d.min)) : d.min > 0 ? t.slower(t.dur(d.min)) : t.sameTime
        const pass = r.kind === 'regional' ? passBeats([r.trip]) : null
        return (
          <button type="button" key={r.kind} className="compare__row" onClick={() => onOpen(r.trip)}>
            <span className="compare__kind"><ModeIcon mode={r.trip.mode} size={20} /> {t.kind[r.kind]}</span>
            <span className="compare__price">{t.euro(r.trip.price)}</span>
            <span className="compare__time">{t.dur(minutes(r.trip))}</span>
            <span className={`compare__diff ${r.trip === base ? 'is-base' : ''}`}>
              {r.trip === base ? t.cheapestBase : `${t.dearer(t.euro(d.euro))} · ${time}`}
            </span>
            {/* внутри вида может быть вариант заметно быстрее самого дешёвого — тоже покажем */}
            {minutes(r.trip) - minutes(r.fastest) >= 30 && r.fastest.price != null && (
              <span className="compare__fast">{t.fastestInKind(t.dur(minutes(r.fastest)), t.euro(r.fastest.price))}</span>
            )}
            {pass && <span className="compare__pass">{t.passOr(t.euro(pass.price), pass.days)}</span>}
          </button>
        )
      })}
    </section>
  )
}
