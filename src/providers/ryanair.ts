import { fetchJson } from '../core/http'
import type { Provider, Trip } from '../core/types'

// Ryanair отдаёт местное время без смещения — добавляем смещение Рима, чтобы сравнивать с остальными.
export function romeIso(local: string): string {
  const s = new Date(local + 'Z').toLocaleString('en-US', { timeZone: 'Europe/Rome', timeZoneName: 'longOffset' })
  return local + (s.match(/GMT([+-]\d\d:\d\d)/)?.[1] ?? '+01:00')
}

export function parseRyanair(json: any, from: string, to: string, date: string): Trip[] {
  return (json.outbound?.fares ?? [])
    .filter((f: any) => f.day === date && f.price && !f.soldOut && !f.unavailable)
    .map((f: any): Trip => ({
      provider: 'Ryanair',
      mode: 'plane',
      depart: romeIso(f.departureDate),
      arrive: romeIso(f.arrivalDate),
      from: `аэропорт ${from}`,
      to: `аэропорт ${to}`,
      price: f.price.value,
      changes: 0,
      vehicles: [`Ryanair ${from} → ${to}`],
      buyUrl: `https://www.ryanair.com/it/it/trip/flights/select?adults=1&dateOut=${date}&originIata=${from}&destinationIata=${to}&isReturn=false`,
    }))
}

/** Весь месяц одним запросом на пару аэропортов. */
export function ryanairMonth(a: string, b: string, date: string) {
  return fetchJson(
    `https://www.ryanair.com/api/farfnd/v4/oneWayFares/${a}/${b}/cheapestPerDay?outboundMonthOfDate=${date.slice(0, 8)}01&currency=EUR`,
  )
}

export const ryanair: Provider = {
  mode: 'plane',
  name: 'Ryanair',
  async search(from, to, date) {
    const pairs = from.airports.flatMap((a) => to.airports.filter((b) => b !== a).map((b) => [a, b]))
    if (!pairs.length) return []
    // пары, где Ryanair не летает, отвечают ошибкой или пустыми днями — это не поломка
    const res = await Promise.allSettled(pairs.map(([a, b]) => ryanairMonth(a, b, date).then((j) => parseRyanair(j, a, b, date))))
    if (res.every((r) => r.status === 'rejected')) throw (res[0] as PromiseRejectedResult).reason
    return res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  },
}
