import { expect, test } from 'vitest'
import { compareKinds, diff, kindOf, passBeats } from '../src/core/compare'
import type { Trip } from '../src/core/types'

const trip = (o: Partial<Trip>): Trip => ({
  provider: 'Trenitalia', mode: 'train', depart: '2026-12-31T08:00:00+01:00', arrive: '2026-12-31T12:00:00+01:00',
  from: 'a', to: 'b', price: 30, changes: 0, vehicles: ['Regionale 4277'], buyUrl: '', ...o,
})

test('вид транспорта по поездам в поездке', () => {
  expect(kindOf(trip({ vehicles: ['Regionale 1', 'Regionale Veloce 2'] }))).toBe('regional')
  expect(kindOf(trip({ vehicles: ['Regionale 1', 'Intercity 541'] }))).toBe('intercity')
  expect(kindOf(trip({ vehicles: ['Intercity 610', 'Frecciarossa 9647'] }))).toBe('frecce')
  expect(kindOf(trip({ mode: 'bus', vehicles: ['FlixBus'] }))).toBe('bus')
  expect(kindOf(trip({ vehicles: ['FlixTrain'] }))).toBe('flixtrain')
})

test('сравнение: строка на вид, по цене, разница во времени', () => {
  const reg = trip({ price: 26.4, arrive: '2026-12-31T13:00:00+01:00' }) // 5 ч
  const fr = trip({ price: 62.9, vehicles: ['Frecciarossa 9611'], arrive: '2026-12-31T11:10:00+01:00' }) // 3 ч 10
  const rows = compareKinds([fr, reg, trip({ price: null })])
  expect(rows.map((r) => r.kind)).toEqual(['regional', 'frecce'])
  expect(diff(fr, reg)).toEqual({ euro: 36.5, min: -110 })
})

test('пасс Italia in Tour: дешевле билетов и в пределах срока', () => {
  const out = trip({ price: 22 })
  const back = trip({ price: 22, depart: '2027-01-02T08:00:00+01:00' }) // 3-й день
  expect(passBeats([out, back])).toEqual({ days: 3, price: 35, tickets: 44 })
  expect(passBeats([out])).toBeNull() // 22 < 35 — пасс невыгоден
  const late = trip({ price: 40, depart: '2027-01-04T08:00:00+01:00' }) // 5-й день
  expect(passBeats([out, late])?.days).toBe(5)
  expect(passBeats([out, trip({ price: 40, depart: '2027-01-06T08:00:00+01:00' })])).toBeNull() // 7 дней
  expect(passBeats([out, trip({ vehicles: ['Intercity 1'], price: 50 })])).toBeNull() // не региональный
})
