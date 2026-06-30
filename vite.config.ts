import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {execSync} from 'child_process';

function scrapePlugin(): Plugin {
  return {
    name: 'scrape-prices',
    configureServer(server) {
      server.middlewares.use('/api/scrape-prices', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({error: 'Csak POST'}));
          return;
        }
        try {
          const out = execSync('npx --no-install tsx scripts/scrape-prices.ts', {
            cwd: __dirname,
            timeout: 120000,
            encoding: 'utf-8'
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({success: true, output: out}));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({success: false, error: err.stderr || err.message || String(err)}));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: '/Hotechnikai-meretezo/',
    plugins: [react(), tailwindcss(), scrapePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
