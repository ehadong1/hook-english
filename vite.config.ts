import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages project site: https://ehadong1.github.io/hook-english/
  base: process.env.NODE_ENV === 'production' ? '/hook-english/' : '/',
  plugins: [react(), tailwindcss()],
})
