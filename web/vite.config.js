import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const adobeKitId = env.VITE_ADOBE_FONTS_KIT_ID || ''
  const hasLocalRoc = fs.existsSync(path.join(__dirname, 'public/fonts/RocGrotesk-Variable.woff2'))

  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'tarajuvva-fonts',
      configResolved(config) {
        if (!hasLocalRoc && !adobeKitId) {
          config.logger.warn(
            '\n[fonts] Roc Grotesk is not loading: add web/public/fonts/RocGrotesk-Variable.woff2 (self-host) or set VITE_ADOBE_FONTS_KIT_ID in web/.env (Adobe Fonts kit). Until then, the stack falls back to Outfit — see web/src/fonts.css.\n'
          )
        }
      },
      transformIndexHtml(html) {
        if (!adobeKitId) return html
        return html.replace(
          '</head>',
          `  <link rel="stylesheet" href="https://use.typekit.net/${adobeKitId}.css" />\n  </head>`
        )
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
  }
})
