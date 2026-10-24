// Форматирование без языка. Всё, что зависит от языка интерфейса, — в i18n.ts.

export const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD по местному времени

/** Время как его пишет перевозчик — местное итальянское, без пересчёта в пояс компьютера. */
export const hhmm = (iso: string) => iso.slice(11, 16)
