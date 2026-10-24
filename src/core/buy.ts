import { fetchJson, openUrl } from './http'
import { loyaltyCode } from './loyalty'
import type { Trip } from './types'

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Параметры для окна Trenitalia: станции этого поезда и время его отправления,
 *  чтобы он стоял первым в списке на сайте. */
export function trenitaliaParams(trip: Trip, origin: unknown, destination: unknown) {
  const day = trip.depart.slice(0, 10)
  const offset = trip.depart.slice(-6) // «+01:00»
  return {
    origin,
    destination,
    date: Date.parse(`${day}T00:00:00${offset}`),
    time: Date.parse(trip.depart),
    local: `${trip.depart.slice(0, 16)}:00.000`,
    code: loyaltyCode(), // карта X-GO — цены участника и в окне покупки
  }
}

async function station(name: string) {
  const list = await fetchJson(
    `https://www.lefrecce.it/Channels.Website.BFF.WEB/website/locations/search?name=${encodeURIComponent(name)}&limit=10`,
  )
  return list.find((s: any) => s.name.toLowerCase() === name.toLowerCase()) ?? list[0]
}

/** «Купить»: у Trenitalia — своё окно со списком поездов, у остальных — сайт в браузере. */
export async function buy(trip: Trip) {
  if (trip.provider !== 'Trenitalia' || !inTauri) return openUrl(trip.buyUrl)
  try {
    const [origin, destination] = await Promise.all([station(trip.from), station(trip.to)])
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_trenitalia', { params: JSON.stringify(trenitaliaParams(trip, origin, destination)) })
  } catch {
    await openUrl(trip.buyUrl) // не вышло — хотя бы обычный сайт
  }
}
