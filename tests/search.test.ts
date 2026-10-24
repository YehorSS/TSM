import { expect, test } from 'vitest'
import { cityByKey } from '../src/core/cities'
import { addDays, labels, minutes, priceDays, search } from '../src/core/search'
import type { Provider, Trip } from '../src/core/types'

const trip = (o: Partial<Trip>): Trip => ({
  provider: 'X', mode: 'train', depart: '2026-11-04T10:00:00+01:00', arrive: '2026-11-04T12:00:00+01:00',
  from: 'a', to: 'b', price: 50, changes: 0, vehicles: [], buyUrl: '', ...o,
})
const mi = cityByKey('milano')!
const ro = cityByKey('roma')!

const ok = (mode: Provider['mode'], trips: Trip[]): Provider => ({ mode, name: mode, search: async () => trips })
const broken: Provider = { mode: 'bus', name: 'Сломанный', search: async () => { throw new Error('500') } }

test('упавший перевозчик не мешает остальным', async () => {
  const r = await search(mi, ro, '2026-11-04', ['train', 'bus'], [ok('train', [trip({})]), broken])
  expect(r.trips).toHaveLength(1)
  expect(r.failed).toEqual(['Сломанный'])
})

test('фильтр транспорта и сортировка по отправлению', async () => {
  const late = trip({ depart: '2026-11-04T18:00:00+01:00', arrive: '2026-11-04T20:00:00+01:00' })
  const early = trip({ depart: '2026-11-04T07:00:00+01:00' })
  const plane = trip({ mode: 'plane' })
  const r = await search(mi, ro, '2026-11-04', ['train'], [ok('train', [late, early]), ok('plane', [plane])])
  expect(r.trips).toEqual([early, late])
})

test('метки: без цены не бывает «самым дешёвым»', () => {
  const free = trip({ price: null })
  const cheap = trip({ price: 19, depart: '2026-11-04T08:00:00+01:00', arrive: '2026-11-04T15:00:00+01:00' })
  const fast = trip({ price: 60, depart: '2026-11-04T09:00:00+01:00', arrive: '2026-11-04T10:00:00+01:00' })
  const l = labels([free, cheap, fast])
  expect(l.cheapest).toBe(cheap)
  expect(l.fastest).toBe(fast)
  expect(l.best).toBe(fast) // 60+15 < 19+105
  expect(labels([])).toEqual({ cheapest: undefined, fastest: undefined, best: undefined })
})

test('длительность через полночь', () => {
  expect(minutes(trip({ depart: '2026-11-04T23:30:00+01:00', arrive: '2026-11-05T01:00:00+01:00' }))).toBe(90)
})

test('календарь цен на 7 дней', async () => {
  const p: Provider = { mode: 'bus', name: 'B', search: async (_a, _b, d) => [trip({ mode: 'bus', price: Number(d.slice(8)) })] }
  const days = await priceDays(mi, ro, '2026-10-30', ['bus'], 7, [p])
  expect(days.map((d) => d.date)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
  expect(days[2].min).toBe(1)
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
})

test('параметры окна Trenitalia: полночь и время поезда по Риму', async () => {
  const { trenitaliaParams } = await import('../src/core/buy')
  const p = trenitaliaParams(trip({ depart: '2026-12-31T14:13:00.000+01:00' }), { id: 1 }, { id: 2 })
  expect(p.local).toBe('2026-12-31T14:13:00.000')
  expect(p.date).toBe(Date.parse('2026-12-30T23:00:00Z'))
  expect(p.time).toBe(Date.parse('2026-12-31T13:13:00Z'))
})
