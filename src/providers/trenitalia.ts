import { fetchJson } from '../core/http'
import type { Provider, Trip } from '../core/types'

const API = 'https://www.lefrecce.it/Channels.Website.BFF.WEB/website/ticket/solutions'
// API отдаёт максимум 10 поездов за раз — берём окна по всему дню и убираем повторы.
const WINDOWS = ['06:00', '09:00', '12:00', '15:00', '18:00']

const vehicle = (t: any) => `${t.trainCategory || t.acronym} ${t.name}`.trim()

export function parseTrenitalia(json: any): Trip[] {
  return (json.solutions ?? []).map(({ solution: s }: any): Trip => ({
    provider: 'Trenitalia',
    mode: 'train',
    depart: s.departureTime,
    arrive: s.arrivalTime,
    from: s.origin,
    to: s.destination,
    price: s.price && !s.price.hideAmount ? s.price.amount : null,
    changes: Math.max(0, s.nodes.length - 1),
    vehicles: s.trains.map(vehicle),
    buyUrl: 'https://www.lefrecce.it/Channels.Website.WEB/',
    legs: s.nodes.map((n: any) => ({
      from: n.origin,
      to: n.destination,
      depart: n.departureTime,
      arrive: n.arrivalTime,
      vehicle: vehicle(n.train),
    })),
  }))
}

export const trenitalia: Provider = {
  mode: 'train',
  name: 'Trenitalia',
  async search(from, to, date) {
    if (!from.tren || !to.tren) return []
    const pages = await Promise.all(
      WINDOWS.map((w) =>
        fetchJson(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departureLocationId: from.tren,
            arrivalLocationId: to.tren,
            departureTime: `${date}T${w}:00.000`,
            adults: 1,
            children: 0,
            criteria: { frecceOnly: false, regionalOnly: false, noChanges: false, order: 'DEPARTURE_DATE', limit: 10, offset: 0 },
            advancedSearchRequest: { bestFare: false },
          }),
        }),
      ),
    )
    const seen = new Set<string>()
    return pages.flatMap(parseTrenitalia).filter((t) => {
      const k = t.depart + t.vehicles.join()
      if (seen.has(k) || !t.depart.startsWith(date)) return false
      seen.add(k)
      return true
    })
  },
}
