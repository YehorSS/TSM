import { useEffect } from 'react'
import { buy } from '../core/buy'
import type { Trip } from '../core/types'
import { changesText, dur, euro, hhmm, MODE_NAME, tripDur } from './format'
import { ModeIcon } from './Icons'

const since = (start: string, iso: string) => {
  const m = Math.round((Date.parse(iso) - Date.parse(start)) / 60000)
  return `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** Бортовой журнал поездки: каждая остановка — строка с временем от отправления. */
export function TripDetails({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const legs = trip.legs?.length ? trip.legs : [{ from: trip.from, to: trip.to, depart: trip.depart, arrive: trip.arrive, vehicle: trip.vehicles[0] }]
  const log: [string, string, string][] = []
  legs.forEach((l, i) => {
    log.push([since(trip.depart, l.depart), `${hhmm(l.depart)}  ${l.from}`, i === 0 ? `посадка · ${l.vehicle}` : `пересадка · ${l.vehicle}`])
    const next = legs[i + 1]
    if (next) {
      const wait = Math.round((Date.parse(next.depart) - Date.parse(l.arrive)) / 60000)
      if (next.from !== l.to || wait > 0) log.push([since(trip.depart, l.arrive), `${hhmm(l.arrive)}  ${l.to}`, `выйти · ждать ${dur(wait)}`])
    } else log.push([since(trip.depart, l.arrive), `${hhmm(l.arrive)}  ${l.to}`, 'прибытие'])
  })

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Подробности поездки" onClick={onClose}>
      <div className="sheet__body" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet__close btn btn--ghost" onClick={onClose} aria-label="Закрыть">✕</button>
        <p className="label"><ModeIcon mode={trip.mode} size={16} /> {MODE_NAME[trip.mode]} · {trip.provider}</p>
        <h2 className="sheet__title">
          {hhmm(trip.depart)} → {hhmm(trip.arrive)}
          <span>{tripDur(trip)} · {changesText(trip.changes)}</span>
        </h2>

        <ol className="log">
          {log.map(([t, place, note], i) => (
            <li key={i}>
              <span className="log__t">{t}</span>
              <span className="log__place">{place}<small>{note}</small></span>
            </li>
          ))}
        </ol>

        <div className="sheet__buy">
          <span className="card__price">{euro(trip.price)}</span>
          <button type="button" className="btn btn--primary btn--big" onClick={() => buy(trip)}>
            Купить на сайте {trip.provider} →
          </button>
        </div>
        {trip.provider === 'Trenitalia' && (
          <p className="notice">Откроется окно Trenitalia со списком поездов на это время — нажмите на этот поезд и «Continue».</p>
        )}
      </div>
    </div>
  )
}
