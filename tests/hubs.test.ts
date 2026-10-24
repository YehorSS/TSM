import { expect, test } from 'vitest'
import { cityByKey } from '../src/core/cities'
import { combine, hubFor, hubWait } from '../src/core/hubs'
import type { City, Trip } from '../src/core/types'

const civitanova: City = {
  key: '830007506:x', name: 'Civitanova Marche', nameFrom: 'Civitanova Marche', nameTo: 'Civitanova Marche', it: 'Civitanova Marche',
  tren: 830007506, flix: 'x', airports: ['AOI'], lat: 43.302, lon: 13.724,
}
const ancona = cityByKey('ancona')!
const torino = cityByKey('torino')!

const trip = (depart: string, arrive: string, price: number | null, v = 'Regionale 1', from = 'Ancona', to = 'Ancona'): Trip => ({
  provider: 'Trenitalia', mode: 'train', depart, arrive, from, to, price, changes: 0, vehicles: [v], buyUrl: '',
})

test('узел для Чивитановы → Турин — Анкона; для двух крупных городов рядом — без узла', () => {
  expect(hubFor(civitanova, torino)?.key).toBe('ancona')
  expect(hubFor(cityByKey('milano')!, cityByKey('bergamo')!)).toBeNull() // 45 км, узел был бы крюком
})

test('город без координат (старое сохранение) — по ближайшему аэропорту', () => {
  const old = { ...civitanova, lat: undefined, lon: undefined }
  expect(hubFor(old, torino)?.key).toBe('ancona')
})

test('склейка: вечером до Анконы, ночным Intercity дальше', () => {
  const evening = trip('2026-12-29T21:10:00+01:00', '2026-12-29T21:40:00+01:00', 4.6)
  const tooLate = trip('2026-12-30T03:05:00+01:00', '2026-12-30T03:10:00+01:00', 3) // 7 мин на пересадку — мало
  const night = trip('2026-12-30T03:17:00+01:00', '2026-12-30T09:25:00+01:00', 30.9, 'InterCityNotte 754')
  const [c, ...rest] = combine([evening, tooLate], [night], ancona)
  expect(rest).toEqual([])
  expect(c.price).toBe(35.5)
  expect(c.parts).toEqual([evening, night])
  expect(c.via?.key).toBe('ancona')
  expect(c.changes).toBe(1)
  expect(hubWait(c)).toBe(5 * 60 + 37)
})

test('склейка: ожидание дольше 14 часов не подходит', () => {
  const morning = trip('2026-12-29T08:00:00+01:00', '2026-12-29T08:30:00+01:00', 4.6)
  const night = trip('2026-12-30T03:17:00+01:00', '2026-12-30T09:25:00+01:00', 30.9)
  expect(combine([morning], [night], ancona)).toEqual([])
})

test('склейка только на той же станции: приехал в Варано — с Анконы не уехать', () => {
  const toVarano = trip('2026-12-29T21:56:00+01:00', '2026-12-29T22:20:00+01:00', 5.8, 'Regionale 19758', 'Civitanova', 'Varano')
  const fromAncona = trip('2026-12-30T03:17:00+01:00', '2026-12-30T09:25:00+01:00', 30.9, 'InterCityNotte 754', 'Ancona', 'Torino')
  expect(combine([toVarano], [fromAncona], ancona)).toEqual([])
})
