import { cached } from '../core/cache'
import { fetchJson } from '../core/http'
import type { Provider, Trip } from '../core/types'

// Ryanair отдаёт местное время без смещения — добавляем смещение Рима, чтобы сравнивать с остальными.
export function romeIso(local: string): string {
  const s = new Date(local + 'Z').toLocaleString('en-US', { timeZone: 'Europe/Rome', timeZoneName: 'longOffset' })
  return local + (s.match(/GMT([+-]\d\d:\d\d)/)?.[1] ?? '+01:00')
}

// Аэропорт пишем кодом — название на языке интерфейса подставляет ui/i18n.ts (place).

export function parseRyanair(json: any, from: string, to: string, date: string): Trip[] {
  return (json.outbound?.fares ?? [])
    .filter((f: any) => f.day === date && f.price && !f.soldOut && !f.unavailable)
    .map((f: any): Trip => ({
      provider: 'Ryanair',
      mode: 'plane',
      depart: romeIso(f.departureDate),
      arrive: romeIso(f.arrivalDate),
      from: `airport:${from}`,
      to: `airport:${to}`,
      price: f.price.value,
      changes: 0,
      vehicles: [`Ryanair ${from} → ${to}`],
      buyUrl: `https://www.ryanair.com/it/it/trip/flights/select?adults=1&dateOut=${date}&originIata=${from}&destinationIata=${to}&isReturn=false`,
    }))
}

/** Весь месяц одним запросом на пару аэропортов. */
export function ryanairMonth(a: string, b: string, date: string) {
  const m = `${date.slice(0, 8)}01`
  return cached(`ryanair-month:${a}:${b}:${m}`, () =>
    fetchJson(`https://www.ryanair.com/api/farfnd/v4/oneWayFares/${a}/${b}/cheapestPerDay?outboundMonthOfDate=${m}&currency=EUR`),
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
