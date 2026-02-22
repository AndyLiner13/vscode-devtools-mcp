import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { inspectorDbPlugin } from './db-plugin';

export default defineConfig({
  plugins: [tailwindcss(), inspectorDbPlugin()],
  server: {
    port: 6275,
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
});
