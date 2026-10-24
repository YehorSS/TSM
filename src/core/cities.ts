import type { City } from './types'

// id взяты из живых API 2026-10-24: Trenitalia locations/search («Tutte le stazioni»),
// FlixBus search/autocomplete/cities. Аэропорты — то, куда реально летают лоукостеры.
// [key, им., род. («из …»), вин. («в …»), it, tren, flix, airports]
const RAW: [string, string, string, string, string, number | null, string | null, string[]][] = [
  ['milano', 'Милан', 'Милана', 'Милан', 'Milano', 830001650, '40ddcc6e-8646-11e6-9066-549f350fcb0c', ['BGY', 'MXP', 'LIN']],
  ['roma', 'Рим', 'Рима', 'Рим', 'Roma', 830008349, '40de90ff-8646-11e6-9066-549f350fcb0c', ['FCO', 'CIA']],
  ['napoli', 'Неаполь', 'Неаполя', 'Неаполь', 'Napoli', 830009993, '40e096c1-8646-11e6-9066-549f350fcb0c', ['NAP']],
  ['torino', 'Турин', 'Турина', 'Турин', 'Torino', 830000996, '40deee02-8646-11e6-9066-549f350fcb0c', ['TRN']],
  ['firenze', 'Флоренция', 'Флоренции', 'Флоренцию', 'Firenze', 830006998, '40de71c6-8646-11e6-9066-549f350fcb0c', ['FLR']],
  ['bologna', 'Болонья', 'Болоньи', 'Болонью', 'Bologna', 830005999, '40df3653-8646-11e6-9066-549f350fcb0c', ['BLQ']],
  ['venezia', 'Венеция', 'Венеции', 'Венецию', 'Venezia', 830002998, '40dea03b-8646-11e6-9066-549f350fcb0c', ['VCE', 'TSF']],
  ['verona', 'Верона', 'Вероны', 'Верону', 'Verona', 830002430, '40dea1ff-8646-11e6-9066-549f350fcb0c', ['VRN']],
  ['genova', 'Генуя', 'Генуи', 'Геную', 'Genova', 830004999, '40df4521-8646-11e6-9066-549f350fcb0c', ['GOA']],
  ['bari', 'Бари', 'Бари', 'Бари', 'Bari', 830011699, '40df3bba-8646-11e6-9066-549f350fcb0c', ['BRI']],
  ['palermo', 'Палермо', 'Палермо', 'Палермо', 'Palermo', 830012792, '40e2af46-8646-11e6-9066-549f350fcb0c', ['PMO']],
  ['catania', 'Катания', 'Катании', 'Катанию', 'Catania', 830012796, 'fb17adee-7d5b-4b10-8872-e930644061f2', ['CTA']],
  ['pisa', 'Пиза', 'Пизы', 'Пизу', 'Pisa', 830006993, '40e09bc2-8646-11e6-9066-549f350fcb0c', ['PSA']],
  ['bergamo', 'Бергамо', 'Бергамо', 'Бергамо', 'Bergamo', 830001529, '40e098df-8646-11e6-9066-549f350fcb0c', ['BGY']],
  ['trieste', 'Триест', 'Триеста', 'Триест', 'Trieste', 830003317, '40de9f2f-8646-11e6-9066-549f350fcb0c', ['TRS']],
  ['padova', 'Падуя', 'Падуи', 'Падую', 'Padova', 830002581, '40de8868-8646-11e6-9066-549f350fcb0c', []],
  ['salerno', 'Салерно', 'Салерно', 'Салерно', 'Salerno', 830009818, '40e1c543-8646-11e6-9066-549f350fcb0c', []],
  ['reggio', 'Реджо-Калабрия', 'Реджо-Калабрии', 'Реджо-Калабрию', 'Reggio Calabria', 830011998, 'bb36045d-982a-4f70-98c2-ce105499a2a7', ['REG']],
  ['lecce', 'Лечче', 'Лечче', 'Лечче', 'Lecce', 830013555, '40e09d39-8646-11e6-9066-549f350fcb0c', []],
  ['rimini', 'Римини', 'Римини', 'Римини', 'Rimini', 830005998, '40df3776-8646-11e6-9066-549f350fcb0c', ['RMI']],
  ['cagliari', 'Кальяри', 'Кальяри', 'Кальяри', 'Cagliari', 830014769, null, ['CAG']],
  ['brindisi', 'Бриндизи', 'Бриндизи', 'Бриндизи', 'Brindisi', 830013556, '40e09c84-8646-11e6-9066-549f350fcb0c', ['BDS']],
  ['ancona', 'Анкона', 'Анконы', 'Анкону', 'Ancona', 830007120, '40df3877-8646-11e6-9066-549f350fcb0c', ['AOI']],
  ['perugia', 'Перуджа', 'Перуджи', 'Перуджу', 'Perugia', 830007004, '40e2814b-8646-11e6-9066-549f350fcb0c', ['PEG']],
]

// координаты крупных городов — для поиска пересадочного узла рядом с маленьким городом
const POS: Record<string, [number, number]> = {
  milano: [45.464, 9.19], roma: [41.903, 12.496], napoli: [40.852, 14.268], torino: [45.07, 7.687], firenze: [43.77, 11.256],
  bologna: [44.495, 11.343], venezia: [45.441, 12.316], verona: [45.438, 10.992], genova: [44.406, 8.946], bari: [41.117, 16.872],
  palermo: [38.116, 13.362], catania: [37.508, 15.083], pisa: [43.723, 10.402], bergamo: [45.698, 9.677], trieste: [45.65, 13.777],
  padova: [45.406, 11.877], salerno: [40.682, 14.768], reggio: [38.111, 15.647], lecce: [40.352, 18.175], rimini: [44.068, 12.57],
  cagliari: [39.224, 9.122], brindisi: [40.633, 17.942], ancona: [43.616, 13.519], perugia: [43.111, 12.391],
}

// английские названия — только там, где они отличаются от итальянских
const EN: Record<string, string> = { milano: 'Milan', roma: 'Rome', napoli: 'Naples', torino: 'Turin', firenze: 'Florence', venezia: 'Venice', genova: 'Genoa', padova: 'Padua' }

export const CITIES: City[] = RAW.map(([key, name, nameFrom, nameTo, it, tren, flix, airports]) => ({
  key, name, nameFrom, nameTo, it, en: EN[key], tren, flix, airports, lat: POS[key]?.[0], lon: POS[key]?.[1],
}))

export const cityByKey = (key: string) => CITIES.find((c) => c.key === key)

export function findCities(q: string): City[] {
  const s = q.trim().toLowerCase()
  if (!s) return CITIES
  const names = (c: City) => [c.name, c.it, c.en ?? ''].filter(Boolean).map((n) => n.toLowerCase())
  // сначала совпадения с начала названия, потом — где угодно в нём
  return [
    ...CITIES.filter((c) => names(c).some((n) => n.startsWith(s))),
    ...CITIES.filter((c) => names(c).every((n) => !n.startsWith(s)) && names(c).some((n) => n.includes(s))),
  ]
}
