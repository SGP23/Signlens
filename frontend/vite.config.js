import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // GitHub Pages SPA routing: copy index.html → 404.html after build
    {
      name: 'copy-index-to-404',
      closeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html')
          console.log('✓ Copied dist/index.html → dist/404.html (SPA routing)')
        } catch (e) {
          console.warn('Could not copy 404.html:', e.message)
        }
      },
    },
  ],
  // GitHub Pages deployment base path
  base: '/Signlens/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
      },
    },
  },
})
