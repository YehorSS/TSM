// Поиск любого города Италии: справочники Trenitalia (станции) и FlixBus (города с координатами).
// Готовый список в cities.ts — только для крупных городов с русскими названиями.
import { CITIES } from './cities'
import { fetchJson } from './http'
import type { City } from './types'

// Аэропорты, куда летает Ryanair, с координатами — чтобы найти ближайшие к маленькому городу.
const AIRPORT_POS: Record<string, [number, number]> = {
  BGY: [45.67, 9.7], MXP: [45.63, 8.72], LIN: [45.45, 9.28], FCO: [41.8, 12.24], CIA: [41.8, 12.59],
  NAP: [40.88, 14.29], TRN: [45.2, 7.65], FLR: [43.81, 11.2], BLQ: [44.53, 11.29], VCE: [45.5, 12.35],
  TSF: [45.65, 12.19], VRN: [45.4, 10.89], GOA: [44.41, 8.84], BRI: [41.14, 16.76], PMO: [38.18, 13.1],
  CTA: [37.47, 15.07], PSA: [43.68, 10.39], TRS: [45.83, 13.47], REG: [38.07, 15.65], RMI: [44.02, 12.61],
  CAG: [39.25, 9.06], BDS: [40.66, 17.95], AOI: [43.62, 13.36], PEG: [43.1, 12.51], PSR: [42.43, 14.18],
  SUF: [38.91, 16.24], CUF: [44.55, 7.62], TPS: [37.91, 12.49], CIY: [36.99, 14.61], AHO: [40.63, 8.29],
  OLB: [40.9, 9.52], PMF: [44.82, 10.3],
}

const km = ([a, b]: [number, number], [c, d]: [number, number]) => {
  const r = Math.PI / 180
  const h = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** До двух аэропортов в радиусе 130 км, ближайшие первыми. */
export function nearAirports(lat: number, lon: number): string[] {
  return Object.entries(AIRPORT_POS)
    .map(([code, pos]) => [code, km([lat, lon], pos)] as const)
    .filter(([, d]) => d <= 130)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([code]) => code)
}

// Русский ввод → итальянское написание: «Чивитанова Марке» → «civitanova marche».
const RU: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'g', з: 'z', и: 'i', й: 'i', к: 'c', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'z', ч: 'c', ш: 'sc',
  щ: 'sc', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'iu', я: 'ia', '-': ' ',
}
export function translit(q: string): string {
  return q
    .toLowerCase()
    .replace(/дж(?=[иеэ])/g, 'g')
    .replace(/дж/g, 'gi')
    .replace(/ч(?![иеэ])/g, 'ci')
    .replace(/к(?=[иеэ])/g, 'ch')
    .replace(/г(?=[иеэ])/g, 'gh')
    .replace(/нь(?=[оаую])/g, 'gn')
    .replace(/[а-яё-]/g, (c) => RU[c] ?? c)
}

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/\(\s*(tutte le stazioni|t\. stazioni)\s*\)/g, '')
    .replace(/\bs\.\s*/g, 'san ')
    .replace(/\s+/g, ' ')
    .trim()

const title = (s: string) => s.replace(/\(\s*(tutte le stazioni|t\. stazioni)\s*\)/gi, '').trim().replace(/\b(\p{L})(\p{L}*)/gu, (_, a, b) => a.toUpperCase() + b.toLowerCase())

const city = (name: string, tren: number | null, flix: string | null, airports: string[], region?: string): City => ({
  key: `${tren ?? ''}:${flix ?? ''}`, name, nameFrom: name, nameTo: name, it: name, tren, flix, airports, region,
})

/** Склеивает ответы двух справочников в города. Город FlixBus + станция Trenitalia,
 *  название которой с него начинается, — один город. */
export function mergePlaces(tren: any[], flix: any[]): City[] {
  const used = new Set<number>()
  const out: City[] = []
  for (const f of flix.filter((x) => x.country === 'it')) {
    const n = norm(f.name)
    const match = tren.filter((t) => norm(t.name).startsWith(n))
    const t = match.find((x) => x.multistation) ?? match[0]
    if (t) used.add(t.id)
    out.push(city(f.name, t?.id ?? null, f.id, nearAirports(f.location.lat, f.location.lon), f.district ?? undefined))
  }
  for (const t of tren) {
    // станции внутри уже найденного «все станции» не показываем отдельно
    if (used.has(t.id) || (t.centroidId && used.has(t.centroidId))) continue
    used.add(t.id)
    out.push(city(title(t.name), t.id, null, []))
  }
  return out
}

const known = new Set(CITIES.flatMap((c) => [c.tren, c.flix]).filter(Boolean))

export async function searchPlaces(q: string): Promise<City[]> {
  const s = /[а-яё]/i.test(q) ? translit(q) : q.trim()
  if (s.length < 2) return []
  const name = encodeURIComponent(s)
  const [tren, flix] = await Promise.allSettled([
    fetchJson(`https://www.lefrecce.it/Channels.Website.BFF.WEB/website/locations/search?name=${name}&limit=10`),
    fetchJson(`https://global.api.flixbus.com/search/autocomplete/cities?q=${name}&lang=it&country=it&flixbus_cities_only=false`),
  ])
  const ok = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])
  return mergePlaces(ok(tren), ok(flix))
    .filter((c) => !known.has(c.tren) && !known.has(c.flix))
    .slice(0, 8)
}
