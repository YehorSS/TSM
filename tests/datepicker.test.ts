import { expect, test } from 'vitest'
import { monthCells, nextMonths } from '../src/ui/DatePicker'

test('12 месяцев вперёд с переходом через год', () => {
  const m = nextMonths('2026-10-24')
  expect(m[0]).toBe('2026-10')
  expect(m[2]).toBe('2026-12')
  expect(m[3]).toBe('2027-01')
  expect(m).toHaveLength(12)
})

test('декабрь 2026 начинается со вторника', () => {
  const c = monthCells('2026-12')
  expect(c[0]).toBeNull() // понедельник пустой
  expect(c[1]).toBe('2026-12-01')
  expect(c.at(-1)).toBe('2026-12-31')
  expect(c.filter(Boolean)).toHaveLength(31)
})

test('период: края по порядку, не длиннее 31 дня', async () => {
  const { periodEnd } = await import('../src/ui/DatePicker')
  expect(periodEnd('2026-12-20', '2026-12-31')).toEqual(['2026-12-20', '2026-12-31'])
  expect(periodEnd('2026-12-31', '2026-12-20')).toEqual(['2026-12-20', '2026-12-31'])
  expect(periodEnd('2026-12-01', '2027-03-01')).toEqual(['2026-12-01', '2026-12-31'])
})
