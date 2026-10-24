const TTL = 2 * 60 * 60 * 1000
// c3: с 2026-10-24 Trenitalia ищется и с полуночи (ночные поезда) — в старом кеше их нет

/** Кеш ответов на 2 часа. Без localStorage (тесты, приватный режим) — просто вызывает fn. */
export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const store = typeof localStorage === 'undefined' ? null : localStorage
  try {
    const hit = store && JSON.parse(store.getItem('c3:' + key) ?? 'null')
    if (hit && Date.now() - hit.at < TTL) return hit.v
  } catch {}
  const v = await fn()
  try {
    store?.setItem('c3:' + key, JSON.stringify({ at: Date.now(), v }))
  } catch {}
  return v
}
