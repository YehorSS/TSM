const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const inBrowser = typeof window !== 'undefined' && !inTauri

export async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  let res: Response
  if (inTauri) {
    const { fetch } = await import('@tauri-apps/plugin-http')
    res = await fetch(url, init)
  } else {
    // в браузере — через прокси Vite (vite.config.ts), в node (тесты, live-скрипт) — напрямую
    res = await fetch(inBrowser ? url.replace(/^https:\/\//, '/px/') : url, init)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

export async function openUrl(url: string) {
  if (inTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
