import { expect, test } from 'vitest'
import { cheapestDay, daysBetween } from '../src/ui/useDayPrices'
import { dict } from '../src/ui/i18n'

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

test('фраза периода на трёх языках', () => {
  const ru = dict('ru').range, en = dict('en').range, it = dict('it').range
  expect(ru('2026-12-20', '2026-12-31')).toBe('с 20 по 31 декабря')
  expect(ru('2026-12-28', '2027-01-05')).toBe('с 28 декабря по 5 января')
  expect(ru('2027-01-02', '2027-01-10')).toBe('со 2 по 10 января')
  expect(en('2026-12-20', '2026-12-31')).toBe('from 20 to 31 December')
  expect(en('2026-12-28', '2027-01-05')).toBe('from 28 December to 5 January')
  expect(it('2026-12-20', '2026-12-31')).toBe('dal 20 al 31 dicembre')
  expect(it('2026-12-28', '2027-01-05')).toBe('dal 28 dicembre al 5 gennaio')
  expect(it('2027-01-08', '2027-01-11')).toBe("dall'8 all'11 gennaio")
})

test('пересадки, длительность и аэропорты на трёх языках', () => {
  expect(dict('ru').changes(3)).toBe('3 пересадки')
  expect(dict('ru').changes(5)).toBe('5 пересадок')
  expect(dict('en').changes(0)).toBe('direct')
  expect(dict('it').changes(2)).toBe('2 cambi')
  expect(dict('ru').dur(190)).toBe('3 ч 10 мин')
  expect(dict('en').place('airport:BGY')).toBe('Bergamo Orio al Serio Airport')
  expect(dict('it').place('airport:FCO')).toBe('Aeroporto di Roma Fiumicino')
  expect(dict('ru').place('Roma Termini')).toBe('Roma Termini')
})
