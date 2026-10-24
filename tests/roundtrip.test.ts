import { expect, test } from 'vitest'
import { pickDefault, total } from '../src/ui/RoundTrip'
import type { Trip } from '../src/core/types'

const trip = (price: number | null, depart = '2026-12-31T10:00:00+01:00'): Trip => ({
  provider: 'X', mode: 'train', depart, arrive: '2026-12-31T12:00:00+01:00', from: 'a', to: 'b', price, changes: 0, vehicles: [], buyUrl: '',
})

test('по умолчанию выбран самый дешёвый, без цен — первый', () => {
  const a = trip(30), b = trip(26.4), c = trip(null)
  expect(pickDefault([a, b, c])).toBe(b)
  expect(pickDefault([c])).toBe(c)
  expect(pickDefault([])).toBeNull()
})

test('итог: сумма без ошибок округления, без цены — нет итога', () => {
  expect(total(trip(26.4), trip(28.25))).toBe(54.65)
  expect(total(trip(0.1), trip(0.2))).toBe(0.3)
  expect(total(trip(null), trip(10))).toBeNull()
  expect(total(null, trip(10))).toBeNull()
})
