import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:9897',
    },
  },
  build: {
    manifest: true,
    copyPublicDir: false,
    rollupOptions: {
      input: '/src/main.tsx',
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          return null;
        },
      },
    },
  },
});
