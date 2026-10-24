const TTL = 2 * 60 * 60 * 1000

/** Кеш ответов на 2 часа. Без localStorage (тесты, приватный режим) — просто вызывает fn. */
export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const store = typeof localStorage === 'undefined' ? null : localStorage
  try {
    const hit = store && JSON.parse(store.getItem('c:' + key) ?? 'null')
    if (hit && Date.now() - hit.at < TTL) return hit.v
  } catch {}
  const v = await fn()
  try {
    store?.setItem('c:' + key, JSON.stringify({ at: Date.now(), v }))
  } catch {}
  return v
}
