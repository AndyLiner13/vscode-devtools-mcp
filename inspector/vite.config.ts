import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { inspectorDbPlugin } from './db-plugin';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  plugins: [tailwindcss(), inspectorDbPlugin()],
  server: {
    open: false,
    port: 6275,
  },
});
