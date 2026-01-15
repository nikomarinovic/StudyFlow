import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/pages',
  base: './',
  publicDir: resolve(__dirname, 'src'),
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/pages/index.html'),
        calendar: resolve(__dirname, 'src/pages/calendar.html'),
        login: resolve(__dirname, 'src/pages/login.html'),
        dashboard: resolve(__dirname, 'src/pages/dashboard.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});