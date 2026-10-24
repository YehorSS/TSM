import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// В браузере API перевозчиков недоступны из-за CORS — в разработке ходим через этот прокси.
// В приложении Tauri запросы идут напрямую через plugin-http (см. src/core/http.ts).
const HOSTS = ['www.lefrecce.it', 'global.api.flixbus.com', 'www.ryanair.com']
const proxy = Object.fromEntries(
  HOSTS.map((h) => [
    `/px/${h}`,
    {
      target: `https://${h}`,
      changeOrigin: true,
      rewrite: (p: string) => p.slice(`/px/${h}`.length),
      configure: (px: any) => px.on('proxyReq', (req: any) => (req.removeHeader('origin'), req.removeHeader('referer'))),
    },
  ]),
)

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // src-tauri/target меняется во время сборки Rust — слежение за ним роняет dev-сервер (EBUSY)
  server: { port: 1420, strictPort: true, proxy, watch: { ignored: ['**/src-tauri/**'] } },
  test: { environment: 'node' },
} as any)
