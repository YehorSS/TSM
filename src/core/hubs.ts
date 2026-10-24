// Поездки из двух отдельных билетов через пересадочный узел: например, вечером Чивитанова → Анкона,
// а ночью или на следующий день Анкона → Турин ночным Intercity. Только для поиска по периоду.
import { CITIES } from './cities'
import { AIRPORT_POS, km } from './places'
import { addDays, minutes, search, type SearchResult } from './search'
import type { City, Mode, Trip } from './types'

const HUB_KM = 120 // узел — крупный город не дальше этого от начала или конца поездки
export const MIN_GAP = 20 // минут на пересадку между разными билетами
export const MAX_GAP = 14 * 60 // дольше ждать бессмысленно (ночь на вокзале — ещё да)
const KEEP = 8 // сколько склеек оставлять на день: самые дешёвые

// Города, сохранённые до 2026-10-24, хранятся без координат — тогда берём ближайший к городу аэропорт.
// ponytail: аэропорт бывает в десятках км от города; если узел выбран странно — выбрать город заново.
const pos = (c: City): [number, number] | null =>
  c.lat != null && c.lon != null ? [c.lat, c.lon] : (AIRPORT_POS[c.airports[0]] ?? null)

/** Ближайший к началу или концу поездки крупный город, который лежит «по пути». Или null. */
export function hubFor(from: City, to: City): City | null {
  const a = pos(from)
  const b = pos(to)
  if (!a || !b) return null
  const whole = km(a, b)
  const best = CITIES.filter((h) => h.key !== from.key && h.key !== to.key && pos(h))
    .map((h) => {
      const p = pos(h)!
      return { h, near: Math.min(km(a, p), km(p, b)), detour: km(a, p) + km(p, b) - whole }
    })
    // рядом с одним из концов и почти без крюка
    .filter((x) => x.near <= HUB_KM && x.detour <= whole * 0.25)
    .sort((x, y) => x.near - y.near)[0]
  return best?.h ?? null
}

/** Склеивает «до узла» и «из узла»: к каждому второму билету — самый дешёвый подходящий первый. */
export function combine(first: Trip[], second: Trip[], hub: City): Trip[] {
  const out: Trip[] = []
  for (const b of second) {
    const fits = first.filter((a) => {
      const gap = (Date.parse(b.depart) - Date.parse(a.arrive)) / 60000
      // та же станция: у узла бывает несколько вокзалов (Анкона и Варано) — переезжать между ними ночью нельзя
      return a.to === b.from && gap >= MIN_GAP && gap <= MAX_GAP && a.price != null
    })
    const a = fits.sort((x, y) => x.price! - y.price! || Date.parse(y.arrive) - Date.parse(x.arrive))[0]
    if (!a || b.price == null) continue
    const leg = (t: Trip) => t.legs?.length ? t.legs : [{ from: t.from, to: t.to, depart: t.depart, arrive: t.arrive, vehicle: t.vehicles[0] }]
    out.push({
      provider: a.provider === b.provider ? a.provider : `${a.provider} + ${b.provider}`,
      mode: a.mode === b.mode ? a.mode : b.mode,
      depart: a.depart,
      arrive: b.arrive,
      from: a.from,
      to: b.to,
      price: Math.round((a.price! + b.price) * 100) / 100,
      changes: a.changes + b.changes + 1,
      vehicles: [...a.vehicles, ...b.vehicles],
      buyUrl: a.buyUrl,
      legs: [...leg(a), ...leg(b)],
      parts: [a, b],
      via: hub,
    })
  }
  return out.sort((x, y) => x.price! - y.price!).slice(0, KEEP)
}

/** Ожидание в узле между двумя билетами, в минутах. */
export const hubWait = (t: Trip) => (t.parts ? Math.round((Date.parse(t.parts[1].depart) - Date.parse(t.parts[0].arrive)) / 60000) : 0)

/** Обычный поиск плюс склейки через узел. Второй билет — в тот же или на следующий день. */
export async function searchVia(from: City, to: City, date: string, modes: Mode[]): Promise<SearchResult> {
  const hub = hubFor(from, to)
  const direct = search(from, to, date, modes)
  if (!hub) return direct
  const [d, a, b1, b2] = await Promise.all([
    direct,
    search(from, hub, date, modes),
    search(hub, to, date, modes),
    search(hub, to, addDays(date, 1), modes),
  ])
  const combos = combine(a.trips, [...b1.trips, ...b2.trips], hub)
  // склейка нужна, только если она дешевле или быстрее прямых вариантов того же дня
  const cheapest = Math.min(...d.trips.map((t) => t.price ?? Infinity))
  const fastest = Math.min(...d.trips.map(minutes))
  const useful = combos.filter((c) => c.price! < cheapest || minutes(c) < fastest)
  return {
    trips: [...d.trips, ...useful].sort((x, y) => Date.parse(x.depart) - Date.parse(y.depart)),
    asked: d.asked,
    failed: [...new Set([...d.failed, ...a.failed, ...b1.failed, ...b2.failed])],
  }
}
