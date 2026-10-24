import { expect, test } from 'vitest'
import { mergePlaces, nearAirports, translit } from '../src/core/places'

test('русский ввод → итальянское написание', () => {
  expect(translit('Чивитанова Марке')).toBe('civitanova marche')
  expect(translit('Пескара')).toBe('pescara')
  expect(translit('Сан-Бенедетто-дель-Тронто')).toBe('san benedetto del tronto')
  expect(translit('Джулианова')).toBe('giulianova')
})

test('Чивитанова: станция Trenitalia и город FlixBus — один город, аэропорт Анкона', () => {
  // реальные ответы API 2026-10-24
  const tren = [{ id: 830007506, name: 'Civitanova Marche-Montegranaro', multistation: false, centroidId: null }]
  const flix = [{ country: 'it', district: 'Marche', name: 'Civitanova Marche', location: { lat: 43.301864, lon: 13.723552 }, id: '40e27cb6-8646-11e6-9066-549f350fcb0c' }]
  const [c, ...rest] = mergePlaces(tren, flix)
  expect(rest).toEqual([])
  expect(c).toMatchObject({ name: 'Civitanova Marche', tren: 830007506, flix: '40e27cb6-8646-11e6-9066-549f350fcb0c', region: 'Marche' })
  expect(c.airports[0]).toBe('AOI')
})

test('станция без города FlixBus остаётся отдельным городом', () => {
  const [c] = mergePlaces([{ id: 1, name: 'S. Benedetto Del Tronto', multistation: false }], [])
  expect(c).toMatchObject({ name: 'S. Benedetto Del Tronto', tren: 1, flix: null, airports: [] })
})

test('аэропорты: ближайший первым, дальше 130 км — нет', () => {
  expect(nearAirports(42.95, 13.88)[0]).toBe('PSR') // Сан-Бенедетто-дель-Тронто
  expect(nearAirports(42.0, 6.0)).toEqual([]) // открытое море
})
