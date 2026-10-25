import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  // three.js is only loaded lazily with the 3D scenes, so its large chunk never blocks first paint.
  build: { outDir: 'dist', chunkSizeWarningLimit: 1400 }
});
