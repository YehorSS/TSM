// Тексты интерфейса на трёх языках. Всё, что видит человек, — здесь; в компонентах — только t.…
import { createContext, useContext } from 'react'
import { addDays } from '../core/search'
import type { City, Mode, Trip } from '../core/types'

export type Lang = 'ru' | 'en' | 'it'
export const LANGS: Lang[] = ['ru', 'en', 'it']
export type ModeChoice = 'all' | Mode

const day = (date: string) => new Date(date + 'T12:00:00')
const todayStr = () => new Date().toLocaleDateString('sv-SE')

// Аэропорты: [по-русски, по-итальянски]; английский — итальянское название + «Airport».
const AIRPORTS: Record<string, [string, string]> = {
  BGY: ['Бергамо, аэропорт Орио-аль-Серио', 'Bergamo Orio al Serio'], MXP: ['Милан, аэропорт Мальпенса', 'Milano Malpensa'],
  LIN: ['Милан, аэропорт Линате', 'Milano Linate'], FCO: ['Рим, аэропорт Фьюмичино', 'Roma Fiumicino'],
  CIA: ['Рим, аэропорт Чампино', 'Roma Ciampino'], NAP: ['Неаполь, аэропорт Каподикино', 'Napoli Capodichino'],
  TRN: ['Турин, аэропорт Казелле', 'Torino Caselle'], FLR: ['Флоренция, аэропорт Перетола', 'Firenze Peretola'],
  BLQ: ['Болонья, аэропорт Маркони', 'Bologna Marconi'], VCE: ['Венеция, аэропорт Марко Поло', 'Venezia Marco Polo'],
  TSF: ['Тревизо, аэропорт (рядом с Венецией)', 'Treviso'], VRN: ['Верона, аэропорт Виллафранка', 'Verona Villafranca'],
  GOA: ['Генуя, аэропорт', 'Genova'], BRI: ['Бари, аэропорт Палезе', 'Bari Palese'],
  PMO: ['Палермо, аэропорт Фальконе-Борселлино', 'Palermo Falcone Borsellino'], CTA: ['Катания, аэропорт Фонтанаросса', 'Catania Fontanarossa'],
  PSA: ['Пиза, аэропорт Галилео Галилей', 'Pisa Galileo Galilei'], TRS: ['Триест, аэропорт Ронки-деи-Леджонари', 'Trieste Ronchi dei Legionari'],
  REG: ['Реджо-Калабрия, аэропорт', 'Reggio Calabria'], RMI: ['Римини, аэропорт Феллини', 'Rimini Fellini'],
  CAG: ['Кальяри, аэропорт Эльмас', 'Cagliari Elmas'], BDS: ['Бриндизи, аэропорт Казале', 'Brindisi Casale'],
  AOI: ['Анкона, аэропорт Фальконара', 'Ancona Falconara'], PEG: ['Перуджа, аэропорт Сан-Франческо', 'Perugia San Francesco'],
  PSR: ['Пескара, аэропорт Абруццо', 'Pescara Abruzzo'], SUF: ['Ламеция-Терме, аэропорт', 'Lamezia Terme'],
  CUF: ['Кунео, аэропорт Леванальдо', 'Cuneo Levaldigi'], TPS: ['Трапани, аэропорт Бирджи', 'Trapani Birgi'],
  CIY: ['Комизо, аэропорт', 'Comiso'], AHO: ['Альгеро, аэропорт Фертилия', 'Alghero Fertilia'],
  OLB: ['Ольбия, аэропорт Коста-Смеральда', 'Olbia Costa Smeralda'], PMF: ['Парма, аэропорт Верди', 'Parma Verdi'],
}

function make(lang: Lang) {
  const locale = { ru: 'ru-RU', en: 'en-GB', it: 'it-IT' }[lang]
  const weekday = (date: string) => day(date).toLocaleDateString(locale, { weekday: 'short' })
  const dayMonth = (date: string) => day(date).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  const fullDay = (date: string) => day(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const rel = (date: string, words: [string, string, string]) => {
    const t = todayStr()
    const i = [t, addDays(t, 1), addDays(t, 2)].indexOf(date)
    return i >= 0 ? words[i] : null
  }
  const n2 = (n: number) => (n === 1 ? 0 : n < 5 ? 1 : 2) // русские формы: 1 / 2–4 / 5+

  const common = {
    lang,
    locale,
    weekday,
    dayMonth,
    euro: (p: number | null) =>
      p == null
        ? { ru: 'цена на сайте', en: 'price on site', it: 'prezzo sul sito' }[lang]
        : `${p.toLocaleString(locale, { minimumFractionDigits: p % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`,
    /** Станция или аэропорт: провайдеры пишут аэропорт кодом «airport:BGY». */
    place: (name: string) => {
      const code = name.match(/^airport:([A-Z]{3})$/)?.[1]
      if (!code) return name
      const [ru, it] = AIRPORTS[code] ?? [`аэропорт ${code}`, code]
      return { ru, en: `${it} Airport`, it: `Aeroporto di ${it}` }[lang]
    },
  }

  if (lang === 'ru') {
    const weekdayIn = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу']
    return {
      ...common,
      when: (date: string) => rel(date, ['сегодня', 'завтра', 'послезавтра']) ?? `${weekdayIn[day(date).getDay()]}, ${dayMonth(date)}`,
      range: (a: string, b: string) => {
        const da = Number(a.slice(8))
        const s = da === 2 ? 'со' : 'с'
        return a.slice(0, 7) === b.slice(0, 7) ? `${s} ${da} по ${dayMonth(b)}` : `${s} ${dayMonth(a)} по ${dayMonth(b)}`
      },
      dur: (m: number) => (m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ''}`),
      changes: (n: number) => (n === 0 ? 'без пересадок' : `${n} ${['пересадка', 'пересадки', 'пересадок'][n2(n)]}`),
      cityFrom: (c: City) => c.nameFrom,
      cityTo: (c: City) => c.nameTo,
      cityName: (c: City) => c.name,
      modePhrase: { all: 'любым транспортом', train: 'поездом', bus: 'автобусом', plane: 'самолётом' } as Record<ModeChoice, string>,
      modeLabel: { all: 'Любой', train: 'Поезд', bus: 'Автобус', plane: 'Самолёт' } as Record<ModeChoice, string>,
      prompt: '> куда отправляемся?',
      iGo: 'Я еду из',
      to: 'в',
      swap: 'Поменять города местами',
      oneWay: 'в одну сторону',
      back: (w: string) => `обратно ${w}`,
      onlyThere: 'Только туда, без обратного',
      backHint: 'или выберите, когда обратно:',
      find: 'Найти билеты',
      recent: 'Недавно искали',
      cityPlaceholder: 'Город, например Чивитанова',
      cityLooking: 'Ищу по всей Италии…',
      cityNone: 'Не нашёл такой город. Попробуйте написать по-итальянски',
      calOneDay: 'Один день',
      calPeriod: 'Период — найти дешевле',
      calQuick: ['Сегодня', 'Завтра', 'Послезавтра'],
      calFirst: (max: number) => `Нажмите первый день, потом последний (до ${max} дней)`,
      calLast: 'Теперь нажмите последний день',
      editSearch: '← Изменить поиск',
      routeBack: (w: string) => ` · обратно ${w}`,
      contacting: '> связываюсь с перевозчиками…',
      scanning: (n: number, of: number) => `> проверяю каждый день: ${n} из ${of}…`,
      scanningBack: (n: number, of: number) => `> обратно: проверяю каждый день, ${n} из ${of}…`,
      cheapestDayThere: 'Самый дешёвый день туда —',
      cheapestDayBack: 'Самый дешёвый день обратно —',
      from: 'от',
      pickOtherDay: 'Нажмите на другой день, чтобы посмотреть его.',
      periodNone: 'В этот период вариантов не нашлось.',
      periodNoneBack: 'Обратно в этот период вариантов не нашлось.',
      offline: ['Нет связи с интернетом.', 'Проверьте Wi-Fi и попробуйте снова.'],
      down: ['Перевозчики сейчас не отвечают.', 'Попробуйте через минуту.'],
      noneDay: ['На этот день вариантов нет.', 'Выберите соседний день на линии выше.'],
      retry: 'Попробовать снова',
      cheapestIs: 'Дешевле всего —',
      at: 'в',
      fastestIs: 'Быстрее всего —',
      andOn: (w: string) => `А ${w} —`,
      modeBy: { train: 'поездом', bus: 'автобусом', plane: 'самолётом' } as Record<Mode, string>,
      modeName: { train: 'Поезд', bus: 'Автобус', plane: 'Самолёт' } as Record<Mode, string>,
      tagCheapest: 'Самый дешёвый',
      tagFastest: 'Самый быстрый',
      tagBest: 'Лучший по цене и времени',
      all: (n: number) => `Все варианты · ${n}`,
      more: (n: number) => `Показать ещё ${n}`,
      carrierDown: (name: string) => `${name} сейчас не отвечает — показываю остальных.`,
      signal: 'ПРИЁМ',
      of: 'из',
      waiting: 'ожидание',
      pricesByDay: 'Цены по дням',
      noPrice: 'нет',
      cheapestHint: 'дешевле всего',
      nextDay: '+1 день',
      buyOn: (p: string) => `Купить на сайте ${p}`,
      details: 'Подробнее',
      there: 'Туда',
      backTitle: 'Обратно',
      total: 'Итого',
      buy: 'Купить',
      pickTrip: 'выберите рейс в списке',
      noneThisDay: 'На этот день вариантов нет — выберите другой день.',
      rtCheapest: 'Туда и обратно дешевле всего —',
      rtNone: ['В один из дней вариантов нет.', 'Попробуйте другие даты.'],
      rtPick: 'Выберите рейс туда и обратно.',
      tripDetails: 'Подробности поездки',
      close: 'Закрыть',
      boarding: (v: string) => `посадка · ${v}`,
      change: (v: string) => `пересадка · ${v}`,
      getOff: (w: string) => `выйти · ждать ${w}`,
      arrival: 'прибытие',
      trenitaliaHint: 'Откроется окно Trenitalia со списком поездов на это время — нажмите на этот поезд и «Continue».',
      langName: 'Русский',
    }
  }

  if (lang === 'en') {
    return {
      ...common,
      when: (date: string) => rel(date, ['today', 'tomorrow', 'the day after tomorrow']) ?? `on ${fullDay(date)}`,
      range: (a: string, b: string) =>
        a.slice(0, 7) === b.slice(0, 7) ? `from ${Number(a.slice(8))} to ${dayMonth(b)}` : `from ${dayMonth(a)} to ${dayMonth(b)}`,
      dur: (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`),
      changes: (n: number) => (n === 0 ? 'direct' : n === 1 ? '1 change' : `${n} changes`),
      cityFrom: (c: City) => c.en ?? c.it,
      cityTo: (c: City) => c.en ?? c.it,
      cityName: (c: City) => c.en ?? c.it,
      modePhrase: { all: 'by any transport', train: 'by train', bus: 'by bus', plane: 'by plane' } as Record<ModeChoice, string>,
      modeLabel: { all: 'Any', train: 'Train', bus: 'Bus', plane: 'Plane' } as Record<ModeChoice, string>,
      prompt: '> where are we going?',
      iGo: "I'm going from",
      to: 'to',
      swap: 'Swap cities',
      oneWay: 'one way',
      back: (w: string) => `back ${w}`,
      onlyThere: 'One way only, no return',
      backHint: 'or choose when to come back:',
      find: 'Find tickets',
      recent: 'Recent searches',
      cityPlaceholder: 'Town, e.g. Civitanova',
      cityLooking: 'Searching all of Italy…',
      cityNone: 'No such town found. Try the Italian spelling',
      calOneDay: 'One day',
      calPeriod: 'Date range — find cheapest',
      calQuick: ['Today', 'Tomorrow', 'Day after'],
      calFirst: (max: number) => `Tap the first day, then the last (up to ${max} days)`,
      calLast: 'Now tap the last day',
      editSearch: '← Change search',
      routeBack: (w: string) => ` · back ${w}`,
      contacting: '> contacting carriers…',
      scanning: (n: number, of: number) => `> checking every day: ${n} of ${of}…`,
      scanningBack: (n: number, of: number) => `> return: checking every day, ${n} of ${of}…`,
      cheapestDayThere: 'Cheapest day to go —',
      cheapestDayBack: 'Cheapest day to return —',
      from: 'from',
      pickOtherDay: 'Tap another day to see it.',
      periodNone: 'Nothing found in this period.',
      periodNoneBack: 'No return trips found in this period.',
      offline: ['No internet connection.', 'Check your Wi-Fi and try again.'],
      down: ['Carriers are not answering right now.', 'Try again in a minute.'],
      noneDay: ['Nothing on this day.', 'Pick a nearby day on the line above.'],
      retry: 'Try again',
      cheapestIs: 'Cheapest —',
      at: 'at',
      fastestIs: 'Fastest —',
      andOn: (w: string) => `And ${w} —`,
      modeBy: { train: 'by train', bus: 'by bus', plane: 'by plane' } as Record<Mode, string>,
      modeName: { train: 'Train', bus: 'Bus', plane: 'Plane' } as Record<Mode, string>,
      tagCheapest: 'Cheapest',
      tagFastest: 'Fastest',
      tagBest: 'Best price and time',
      all: (n: number) => `All options · ${n}`,
      more: (n: number) => `Show ${n} more`,
      carrierDown: (name: string) => `${name} is not answering — showing the others.`,
      signal: 'SIGNAL',
      of: 'of',
      waiting: 'waiting',
      pricesByDay: 'Prices by day',
      noPrice: 'none',
      cheapestHint: 'cheapest',
      nextDay: '+1 day',
      buyOn: (p: string) => `Buy on ${p}`,
      details: 'Details',
      there: 'Outbound',
      backTitle: 'Return',
      total: 'Total',
      buy: 'Buy',
      pickTrip: 'pick a trip in the list',
      noneThisDay: 'Nothing on this day — pick another day.',
      rtCheapest: 'Cheapest round trip —',
      rtNone: ['One of the days has no options.', 'Try other dates.'],
      rtPick: 'Pick a trip there and back.',
      tripDetails: 'Trip details',
      close: 'Close',
      boarding: (v: string) => `board · ${v}`,
      change: (v: string) => `change · ${v}`,
      getOff: (w: string) => `get off · wait ${w}`,
      arrival: 'arrival',
      trenitaliaHint: 'A Trenitalia window opens with the trains for this time — tap this train and press "Continue".',
      langName: 'English',
    }
  }

  // italiano: «dall'8», «all'11» — elisione davanti a vocale
  const dal = (d: number) => ([8, 11].includes(d) ? `dall'${d}` : `dal ${d}`)
  const al = (d: number) => ([8, 11].includes(d) ? `all'${d}` : `al ${d}`)
  return {
    ...common,
    when: (date: string) => rel(date, ['oggi', 'domani', 'dopodomani']) ?? fullDay(date),
    range: (a: string, b: string) => {
      const [da, db] = [Number(a.slice(8)), Number(b.slice(8))]
      const month = (d: string) => dayMonth(d).replace(/^\d+\s/, '')
      return a.slice(0, 7) === b.slice(0, 7)
        ? `${dal(da)} ${al(db)} ${month(b)}`
        : `${dal(da)} ${month(a)} ${al(db)} ${month(b)}`
    },
    dur: (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`),
    changes: (n: number) => (n === 0 ? 'diretto' : n === 1 ? '1 cambio' : `${n} cambi`),
    cityFrom: (c: City) => c.it,
    cityTo: (c: City) => c.it,
    cityName: (c: City) => c.it,
    modePhrase: { all: 'con qualsiasi mezzo', train: 'in treno', bus: 'in autobus', plane: 'in aereo' } as Record<ModeChoice, string>,
    modeLabel: { all: 'Qualsiasi', train: 'Treno', bus: 'Autobus', plane: 'Aereo' } as Record<ModeChoice, string>,
    prompt: '> dove andiamo?',
    iGo: 'Vado da',
    to: 'a',
    swap: 'Inverti le città',
    oneWay: 'solo andata',
    back: (w: string) => `ritorno ${w}`,
    onlyThere: 'Solo andata, senza ritorno',
    backHint: 'oppure scegli quando tornare:',
    find: 'Cerca biglietti',
    recent: 'Ricerche recenti',
    cityPlaceholder: 'Città, es. Civitanova',
    cityLooking: 'Cerco in tutta Italia…',
    cityNone: 'Città non trovata',
    calOneDay: 'Un giorno',
    calPeriod: 'Periodo — trova il più economico',
    calQuick: ['Oggi', 'Domani', 'Dopodomani'],
    calFirst: (max: number) => `Tocca il primo giorno, poi l'ultimo (fino a ${max} giorni)`,
    calLast: "Ora tocca l'ultimo giorno",
    editSearch: '← Modifica ricerca',
    routeBack: (w: string) => ` · ritorno ${w}`,
    contacting: '> contatto i vettori…',
    scanning: (n: number, of: number) => `> controllo ogni giorno: ${n} di ${of}…`,
    scanningBack: (n: number, of: number) => `> ritorno: controllo ogni giorno, ${n} di ${of}…`,
    cheapestDayThere: "Giorno più economico per l'andata —",
    cheapestDayBack: 'Giorno più economico per il ritorno —',
    from: 'da',
    pickOtherDay: 'Tocca un altro giorno per vederlo.',
    periodNone: 'Nessuna soluzione in questo periodo.',
    periodNoneBack: 'Nessun ritorno in questo periodo.',
    offline: ['Nessuna connessione a internet.', 'Controlla il Wi-Fi e riprova.'],
    down: ['I vettori non rispondono.', 'Riprova tra un minuto.'],
    noneDay: ['Nessuna soluzione in questo giorno.', 'Scegli un giorno vicino sulla linea sopra.'],
    retry: 'Riprova',
    cheapestIs: 'Il più economico —',
    at: 'alle',
    fastestIs: 'Il più veloce —',
    andOn: (w: string) => `E ${w} —`,
    modeBy: { train: 'in treno', bus: 'in autobus', plane: 'in aereo' } as Record<Mode, string>,
    modeName: { train: 'Treno', bus: 'Autobus', plane: 'Aereo' } as Record<Mode, string>,
    tagCheapest: 'Più economico',
    tagFastest: 'Più veloce',
    tagBest: 'Miglior prezzo e tempo',
    all: (n: number) => `Tutte le soluzioni · ${n}`,
    more: (n: number) => `Mostra altre ${n}`,
    carrierDown: (name: string) => `${name} non risponde — mostro gli altri.`,
    signal: 'SEGNALE',
    of: 'di',
    waiting: 'attesa',
    pricesByDay: 'Prezzi per giorno',
    noPrice: 'no',
    cheapestHint: 'più economico',
    nextDay: '+1 giorno',
    buyOn: (p: string) => `Acquista su ${p}`,
    details: 'Dettagli',
    there: 'Andata',
    backTitle: 'Ritorno',
    total: 'Totale',
    buy: 'Acquista',
    pickTrip: 'scegli una soluzione nella lista',
    noneThisDay: 'Nessuna soluzione in questo giorno — scegline un altro.',
    rtCheapest: 'Andata e ritorno al prezzo più basso —',
    rtNone: ['In uno dei giorni non ci sono soluzioni.', 'Prova altre date.'],
    rtPick: "Scegli l'andata e il ritorno.",
    tripDetails: 'Dettagli del viaggio',
    close: 'Chiudi',
    boarding: (v: string) => `salita · ${v}`,
    change: (v: string) => `cambio · ${v}`,
    getOff: (w: string) => `scendere · attesa ${w}`,
    arrival: 'arrivo',
    trenitaliaHint: 'Si apre una finestra Trenitalia con i treni per questo orario — tocca questo treno e "Continue".',
    langName: 'Italiano',
  }
}

export type T = ReturnType<typeof make>
const cache = new Map<Lang, T>()
export const dict = (lang: Lang): T => cache.get(lang) ?? (cache.set(lang, make(lang)), cache.get(lang)!)

export const LangContext = createContext<T>(dict('ru'))
export const useT = () => useContext(LangContext)

/** Язык при первом запуске — по системе; русский, если система не на английском и не на итальянском. */
export function systemLang(): Lang {
  const l = (typeof navigator !== 'undefined' ? navigator.language : 'ru').slice(0, 2)
  return l === 'en' || l === 'it' ? l : 'ru'
}

export const tripDurT = (t: T, trip: Trip) => t.dur(Math.round((Date.parse(trip.arrive) - Date.parse(trip.depart)) / 60000))
