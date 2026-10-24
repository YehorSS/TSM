import { expect, test } from 'vitest'
import { CITIES, findCities } from '../src/core/cities'

test('поиск города по-русски и по-итальянски', () => {
  expect(findCities('мил')[0].key).toBe('milano')
  expect(findCities('Rom')[0].key).toBe('roma')
  expect(findCities('  ')).toHaveLength(CITIES.length)
})

test('у каждого города есть хоть один перевозчик', () => {
  for (const c of CITIES) expect(c.tren ?? c.flix ?? c.airports[0], c.key).toBeTruthy()
})
