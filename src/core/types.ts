export type Mode = 'train' | 'bus' | 'plane'

export interface City {
  key: string
  name: string // «Милан»
  nameFrom: string // «Милана» — для фразы «из …»
  nameTo: string // «Рим» — для фразы «в …»
  it: string // итальянское название, для поиска
  en?: string // английское, если отличается от итальянского (Milan, Rome…)
  tren: number | null // id Trenitalia «все станции города»
  flix: string | null // id города FlixBus
  airports: string[] // IATA
  region?: string // «Marche» — подсказка в списке для маленьких городов
}

export interface Trip {
  provider: string
  mode: Mode
  depart: string // ISO со смещением
  arrive: string
  from: string
  to: string
  price: number | null // EUR
  changes: number
  vehicles: string[]
  buyUrl: string
  legs?: { from: string; to: string; depart: string; arrive: string; vehicle: string }[]
}

export interface Provider {
  mode: Mode
  name: string
  search(from: City, to: City, date: string): Promise<Trip[]>
}
