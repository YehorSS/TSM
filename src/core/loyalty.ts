// Номер карты X-GO / CartaFreccia. Хранится только на этом компьютере и уходит только в Trenitalia:
// с ним поиск Trenitalia возвращает цены для участников программы.

const KEY = 'loyaltyCode'
let rejected = false // Trenitalia ответила «код недействителен» на последнем поиске

export function loyaltyCode(): string {
  try {
    return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(KEY) ?? '')
  } catch {
    return ''
  }
}

/** Оставляет только цифры; пустая строка — убрать карту. */
export function setLoyaltyCode(code: string) {
  const clean = code.replace(/\D/g, '')
  rejected = false
  try {
    clean ? localStorage.setItem(KEY, clean) : localStorage.removeItem(KEY)
  } catch {}
  return clean
}

export const loyaltyRejected = () => rejected
export const markLoyaltyRejected = (v: boolean) => void (rejected = v)
