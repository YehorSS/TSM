import { fetchJson } from '../core/http'
import type { Provider, Trip } from '../core/types'

const dmy = (date: string) => date.split('-').reverse().join('.')
const kind = (l: any) => (l.means_of_transport === 'train' ? 'FlixTrain' : 'FlixBus')

export function parseFlix(json: any, buyUrl = ''): Trip[] {
  const station = (id: string) => json.stations?.[id]?.name ?? ''
  return (json.trips ?? []).flatMap((trip: any) =>
    Object.values(trip.results ?? {})
      .filter((r: any) => r.status === 'available')
      .map((r: any): Trip => ({
        provider: 'FlixBus',
        mode: r.legs.every((l: any) => l.means_of_transport === 'train') ? 'train' : 'bus',
        depart: r.departure.date,
        arrive: r.arrival.date,
        from: station(r.departure.station_id),
        to: station(r.arrival.station_id),
        price: r.price?.total_with_platform_fee ?? r.price?.total ?? null,
        changes: Math.max(0, r.legs.length - 1),
        vehicles: r.legs.map(kind),
        buyUrl,
        legs: r.legs.map((l: any) => ({
          from: station(l.departure.station_id),
          to: station(l.arrival.station_id),
          depart: l.departure.date,
          arrive: l.arrival.date,
          vehicle: kind(l),
        })),
      })),
  )
}

export const flixbus: Provider = {
  mode: 'bus',
  name: 'FlixBus',
  async search(from, to, date) {
    if (!from.flix || !to.flix) return []
    const q = `from_city_id=${from.flix}&to_city_id=${to.flix}&departure_date=${dmy(date)}`
    const json = await fetchJson(
      `https://global.api.flixbus.com/search/service/v4/search?${q}&products=%7B%22adult%22%3A1%7D&currency=EUR&locale=it&search_by=cities&include_after_midnight_rides=0`,
    )
    return parseFlix(json, `https://shop.flixbus.it/search?departureCity=${from.flix}&arrivalCity=${to.flix}&rideDate=${dmy(date)}&adult=1`)
  },
}
