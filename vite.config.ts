import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // three.js (Antikoerper3D) lädt erst nach und ist allein so groß
  build: { chunkSizeWarningLimit: 600 },
})
