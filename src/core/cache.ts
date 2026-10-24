const TTL = 2 * 60 * 60 * 1000
// c2: с 2026-10-24 распроданные поезда Trenitalia отбрасываются — старый кеш c: их ещё содержит

/** Кеш ответов на 2 часа. Без localStorage (тесты, приватный режим) — просто вызывает fn. */
export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const store = typeof localStorage === 'undefined' ? null : localStorage
  try {
    const hit = store && JSON.parse(store.getItem('c2:' + key) ?? 'null')
    if (hit && Date.now() - hit.at < TTL) return hit.v
  } catch {}
  const v = await fn()
  try {
    store?.setItem('c2:' + key, JSON.stringify({ at: Date.now(), v }))
  } catch {}
  return v
}
