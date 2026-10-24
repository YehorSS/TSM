import { expect, test, vi } from 'vitest'
import tren from './fixtures/trenitalia.json'
import flix from './fixtures/flixbus.json'
import ryan from './fixtures/ryanair.json'
import { parseTrenitalia } from '../src/providers/trenitalia'
import { flixbus, parseFlix } from '../src/providers/flixbus'
import { parseRyanair, romeIso, ryanair } from '../src/providers/ryanair'
import { cityByKey } from '../src/core/cities'

test('Trenitalia: реальный ответ Милан→Рим', () => {
  const [t] = parseTrenitalia(tren)
  expect(t.vehicles[0]).toBe('Frecciarossa 9611')
  expect(t.price).toBe(62.9)
  expect(t.changes).toBe(0)
  expect(t.from).toBe('Milano Centrale')
})

test('Trenitalia: распроданный поезд (INHIBITED) не показывается', () => {
  const sold = structuredClone(tren)
  sold.solutions[0].solution.status = 'INHIBITED' // так приходит поезд без мест, с ценой 5,80 €
  const trips = parseTrenitalia(sold)
  expect(trips).toHaveLength(tren.solutions.length - 1)
  expect(trips[0].vehicles[0]).not.toBe('Frecciarossa 9611')
})

test('FlixBus: реальный ответ', () => {
  const [t] = parseFlix(flix, 'x')
  expect(t.mode).toBe('bus')
  expect(t.price).toBe(17.98)
  expect(t.from).toBe('Milano (Lampugnano)')
})

test('Ryanair: нужный день, распроданные пропускаются', () => {
  const [t] = parseRyanair(ryan, 'BGY', 'CTA', '2026-11-01')
  expect(t.price).toBe(19.99)
  expect(t.depart).toBe('2026-11-01T06:00:00+01:00')
  expect(parseRyanair(ryan, 'BGY', 'CTA', '2026-11-02')).toEqual([])
})

test('romeIso учитывает летнее время', () => {
  expect(romeIso('2026-07-01T10:00:00')).toBe('2026-07-01T10:00:00+02:00')
})

test('город без FlixBus/аэропорта — пустой ответ без запроса', async () => {
  const spy = vi.spyOn(globalThis, 'fetch')
  expect(await flixbus.search(cityByKey('cagliari')!, cityByKey('roma')!, '2026-11-04')).toEqual([])
  expect(await ryanair.search(cityByKey('padova')!, cityByKey('roma')!, '2026-11-04')).toEqual([])
  expect(spy).not.toHaveBeenCalled()
})
