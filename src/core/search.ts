import { flixbus } from '../providers/flixbus'
import { ryanair } from '../providers/ryanair'
import { trenitalia } from '../providers/trenitalia'
import { cached } from './cache'
import { loyaltyCode } from './loyalty'
import type { City, Mode, Provider, Trip } from './types'

export const PROVIDERS: Provider[] = [trenitalia, flixbus, ryanair]

export const minutes = (t: Trip) => Math.round((Date.parse(t.arrive) - Date.parse(t.depart)) / 60000)

export interface SearchResult {
  trips: Trip[]
  asked: string[] // кого спрашивали
  failed: string[] // кто не ответил
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
    // номер карты X-GO меняет цены Trenitalia — он часть ключа кеша
    use.map((p) => cached(`${p.name}:${from.key}:${to.key}:${date}:${loyaltyCode()}`, () => p.search(from, to, date))),
  )
  const trips = res
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((t) => modes.includes(t.mode))
    .sort((a, b) => Date.parse(a.depart) - Date.parse(b.depart))
  return { trips, asked: use.map((p) => p.name), failed: use.filter((_, i) => res[i].status === 'rejected').map((p) => p.name) }
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

export interface DayPrice {
  date: string
  min: number | null // null — вариантов нет
  loading?: boolean
}

/** Минимальная цена на каждый из `days` дней начиная со `start`. По дню за раз —
 *  чтобы не засыпать Trenitalia десятками запросов; onDay отдаёт дни по мере готовности. */
export async function priceDays(
  from: City, to: City, start: string, modes: Mode[], days = 7, providers = PROVIDERS,
  onDay?: (d: DayPrice) => void,
  find: (from: City, to: City, date: string, modes: Mode[]) => Promise<SearchResult> = (a, b, d, m) => search(a, b, d, m, providers),
): Promise<DayPrice[]> {
  const out: DayPrice[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    const { trips } = await find(from, to, date, modes)
    const d = { date, min: labels(trips).cheapest?.price ?? null }
    out.push(d)
    onDay?.(d)
  }
  return out
}
