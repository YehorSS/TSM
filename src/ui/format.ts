import { addDays, minutes } from '../core/search'
import type { Mode, Trip } from '../core/types'

export const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD по местному времени

/** Время как его пишет перевозчик — местное итальянское, без пересчёта в пояс компьютера. */
export const hhmm = (iso: string) => iso.slice(11, 16)

export const dur = (m: number) => (m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ''}`)
export const tripDur = (t: Trip) => dur(minutes(t))

export const euro = (p: number | null) =>
  p == null ? 'цена на сайте' : `${p.toLocaleString('ru-RU', { minimumFractionDigits: p % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`

const d = (date: string) => new Date(date + 'T12:00:00')
export const weekday = (date: string) => d(date).toLocaleDateString('ru-RU', { weekday: 'short' })
export const dayMonth = (date: string) => d(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const weekdayIn = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу']

/** «сегодня» / «завтра» / «в среду, 5 ноября» */
export function whenPhrase(date: string) {
  const t = today()
  if (date === t) return 'сегодня'
  if (date === addDays(t, 1)) return 'завтра'
  if (date === addDays(t, 2)) return 'послезавтра'
  return `${weekdayIn[d(date).getDay()]}, ${dayMonth(date)}`
}

export const MODE_PHRASE: Record<string, string> = {
  all: 'любым транспортом',
  train: 'поездом',
  bus: 'автобусом',
  plane: 'самолётом',
}
export const MODE_NAME: Record<Mode, string> = { train: 'Поезд', bus: 'Автобус', plane: 'Самолёт' }
export const MODE_BY: Record<Mode, string> = { train: 'поездом', bus: 'автобусом', plane: 'самолётом' }

export const changesText = (n: number) =>
  n === 0 ? 'без пересадок' : n === 1 ? '1 пересадка' : n < 5 ? `${n} пересадки` : `${n} пересадок`

/** «с 20 по 31 декабря», «с 28 декабря по 5 января», «со 2 по 10 января» */
export function rangePhrase(a: string, b: string) {
  const da = Number(a.slice(8))
  const s = da === 2 ? 'со' : 'с'
  return a.slice(0, 7) === b.slice(0, 7) ? `${s} ${da} по ${dayMonth(b)}` : `${s} ${dayMonth(a)} по ${dayMonth(b)}`
}
