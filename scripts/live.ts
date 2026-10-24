// Живая проверка всех перевозчиков: `npm run live`. Запускать, когда что-то перестало находиться.
import { cityByKey } from '../src/core/cities'
import { addDays, PROVIDERS } from '../src/core/search'

const date = addDays(new Date().toISOString().slice(0, 10), 10)
const routes = [['milano', 'roma'], ['bergamo', 'catania']]
for (const p of PROVIDERS)
  for (const [a, b] of routes) {
    try {
      const trips = await p.search(cityByKey(a)!, cityByKey(b)!, date)
      const prices = trips.map((t) => t.price).filter((x) => x != null) as number[]
      console.log(`OK   ${p.name.padEnd(10)} ${a}→${b} ${date}: ${trips.length} вариантов, от ${Math.min(...prices)} €`)
    } catch (e) {
      console.log(`FAIL ${p.name.padEnd(10)} ${a}→${b}: ${(e as Error).message}`)
    }
  }
