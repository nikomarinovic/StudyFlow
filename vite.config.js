import { defineConfig } from 'vite';
import { resolve, extname } from 'path';
import fs from 'fs';

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
        dashboard: resolve(__dirname, 'src/pages/dashboard.html'),
        '404': resolve(__dirname, 'src/pages/404.html')
      }
    }
  },
  plugins: [
    {
      name: 'vite-serve-404',
      configureServer(server) {
        const pagesDir = resolve(__dirname, 'src/pages');
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET') return next();
          const url = (req.url || '').split('?')[0];

          if (!url || url.startsWith('/@') || url.includes('sockjs-node')) return next();

          const extension = extname(url);
          if (extension && extension !== '.html') return next();

          if (url.startsWith('/src/') || url.startsWith('/assets/') || url.startsWith('/node_modules/')) return next();

          const candidates = [];
          if (url === '/' || url === '') {
            candidates.push(resolve(pagesDir, 'index.html'));
          } else {
            const p = resolve(pagesDir, '.' + url);
            candidates.push(p);
            candidates.push(p + '.html');
            candidates.push(resolve(pagesDir, url, 'index.html'));
          }

          const exists = candidates.some(p => fs.existsSync(p));
          if (!exists) {
            const file404 = resolve(pagesDir, '404.html');
            if (fs.existsSync(file404)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/html');
              res.end(fs.readFileSync(file404));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
});