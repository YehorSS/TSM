import { fetchJson } from '../core/http'
import { loyaltyCode, markLoyaltyRejected } from '../core/loyalty'
import type { Provider, Trip } from '../core/types'

const API = 'https://www.lefrecce.it/Channels.Website.BFF.WEB/website/ticket/solutions'
// API отдаёт максимум 10 поездов за раз — берём окна по всему дню и убираем повторы.
// 00:00 — ради ночных поездов (Intercity Notte и др.): они часто самые дешёвые.
export const WINDOWS = ['00:00', '06:00', '09:00', '12:00', '15:00', '18:00']

const vehicle = (t: any) => `${t.trainCategory || t.acronym} ${t.name}`.trim()

export function parseTrenitalia(json: any): Trip[] {
  // распроданные приходят со status INHIBITED и ценой — купить их нельзя, не показываем
  return (json.solutions ?? []).filter(({ solution: s }: any) => s.status === 'SALEABLE').map(({ solution: s }: any): Trip => ({
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

// «Основные решения» Trenitalia прячут часть поездок одними региональными поездами — а они самые
// дешёвые и подходят под пасс Italia in Tour. Поэтому отдельно спрашиваем «только региональные».
const REGIONAL_WINDOWS = ['07:00', '13:00']

function request(from: number, to: number, date: string, time: string, regionalOnly: boolean, code: string) {
  return fetchJson(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      departureLocationId: from,
      arrivalLocationId: to,
      departureTime: `${date}T${time}:00.000`,
      adults: 1,
      children: 0,
      criteria: { frecceOnly: false, regionalOnly, noChanges: false, order: 'DEPARTURE_DATE', limit: 10, offset: 0 },
      // с номером карты X-GO / CartaFreccia Trenitalia возвращает цены для участников
      advancedSearchRequest: code ? { bestFare: false, loyaltyCodes: [code] } : { bestFare: false },
    }),
  })
}

async function all(from: number, to: number, date: string, code: string) {
  const [main, regional] = await Promise.all([
    Promise.all(WINDOWS.map((w) => request(from, to, date, w, false, code))),
    // «только региональных» на маршруте может не быть вовсе — тогда Trenitalia отвечает 400, это не поломка
    Promise.allSettled(REGIONAL_WINDOWS.map((w) => request(from, to, date, w, true, code))),
  ])
  return [...main, ...regional.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))]
}

export const trenitalia: Provider = {
  mode: 'train',
  name: 'Trenitalia',
  async search(from, to, date) {
    if (!from.tren || !to.tren) return []
    const code = loyaltyCode()
    let pages
    try {
      pages = await all(from.tren, to.tren, date, code)
      if (code) markLoyaltyRejected(false)
    } catch (e) {
      if (!code) throw e
      // номер карты не приняли (Trenitalia отвечает 400) — ищем без него и говорим об этом
      markLoyaltyRejected(true)
      pages = await all(from.tren, to.tren, date, '')
    }
    const seen = new Set<string>()
    return pages.flatMap(parseTrenitalia).filter((t) => {
      const k = t.depart + t.vehicles.join()
      if (seen.has(k) || !t.depart.startsWith(date)) return false
      seen.add(k)
      return true
    })
  },
}
