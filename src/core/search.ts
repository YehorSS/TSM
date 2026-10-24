import { flixbus } from '../providers/flixbus'
import { ryanair } from '../providers/ryanair'
import { trenitalia } from '../providers/trenitalia'
import { cached } from './cache'
import type { City, Mode, Provider, Trip } from './types'

export const PROVIDERS: Provider[] = [trenitalia, flixbus, ryanair]

export const minutes = (t: Trip) => Math.round((Date.parse(t.arrive) - Date.parse(t.depart)) / 60000)

export interface SearchResult {
  trips: Trip[]
  failed: string[] // имена перевозчиков, которые не ответили
}

export async function search(
  from: City,
  to: City,
  date: string,
  modes: Mode[],
  providers: Provider[] = PROVIDERS,
): Promise<SearchResult> {
  // FlixBus возит и автобусы, и поезда FlixTrain — его спрашиваем при любом из двух режимов
  const use = providers.filter((p) => modes.includes(p.mode) || (p.name === 'FlixBus' && modes.includes('train')))
  const res = await Promise.allSettled(
    use.map((p) => cached(`${p.name}:${from.key}:${to.key}:${date}`, () => p.search(from, to, date))),
  )
  const trips = res
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((t) => modes.includes(t.mode))
    .sort((a, b) => Date.parse(a.depart) - Date.parse(b.depart))
  return { trips, failed: use.filter((_, i) => res[i].status === 'rejected').map((p) => p.name) }
}

export function labels(trips: Trip[]): { cheapest?: Trip; fastest?: Trip; best?: Trip } {
  const priced = trips.filter((t) => t.price != null)
  const min = (list: Trip[], f: (t: Trip) => number) =>
    list.reduce<Trip | undefined>((m, t) => (m && f(m) <= f(t) ? m : t), undefined)
  return {
    cheapest: min(priced, (t) => t.price!),
    fastest: min(trips, minutes),
    // «лучший»: час в пути считаем как 15 € — баланс цены и времени
    best: min(priced, (t) => t.price! + (15 * minutes(t)) / 60),
  }
}

export const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Минимальная цена на каждый из `days` дней начиная со `start`. */
export async function priceDays(from: City, to: City, start: string, modes: Mode[], days = 7, providers = PROVIDERS) {
  return Promise.all(
    Array.from({ length: days }, (_, i) => addDays(start, i)).map(async (date) => {
      const { trips } = await search(from, to, date, modes, providers)
      return { date, min: labels(trips).cheapest?.price ?? null }
    }),
  )
}
