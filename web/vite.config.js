import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const adobeKitId = env.VITE_ADOBE_FONTS_KIT_ID || ''

  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'tarajuvva-fonts',
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
