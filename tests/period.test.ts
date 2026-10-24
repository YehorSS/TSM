import { expect, test } from 'vitest'
import { cheapestDay, daysBetween } from '../src/ui/useDayPrices'
import { rangePhrase } from '../src/ui/format'

test('самый дешёвый день: при равной цене — ранний, дни без цены не считаются', () => {
  const days = [
    { date: '2026-12-20', min: null },
    { date: '2026-12-21', min: 19 },
    { date: '2026-12-22', min: 25 },
    { date: '2026-12-23', min: 19 },
  ]
  expect(cheapestDay(days)?.date).toBe('2026-12-21')
  expect(cheapestDay([{ date: '2026-12-20', min: null }])).toBeNull()
})

test('дни периода через Новый год', () => {
  expect(daysBetween('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
})

test('фраза периода', () => {
  expect(rangePhrase('2026-12-20', '2026-12-31')).toBe('с 20 по 31 декабря')
  expect(rangePhrase('2026-12-28', '2027-01-05')).toBe('с 28 декабря по 5 января')
  expect(rangePhrase('2027-01-02', '2027-01-10')).toBe('со 2 по 10 января')
})
