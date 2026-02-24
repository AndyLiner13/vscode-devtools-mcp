import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

import { inspectorDbPlugin } from './db-plugin';

/**
 * Suppresses Vite's automatic full-page reload on file changes.
 * Vite still watches and rebuilds modules, but the browser only
 * picks up changes when the user manually refreshes (F5).
 */
function noAutoReload(): Plugin {
	return {
		name: 'no-auto-reload',
		handleHotUpdate() {
			// Returning an empty array tells Vite "nothing to update",
			// which prevents both HMR patches and full-page reloads.
			return [];
		}
	};
}

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					'monaco-editor': ['monaco-editor']
				}
			}
		}
	},
	plugins: [tailwindcss(), inspectorDbPlugin(), noAutoReload()],
	server: {
		open: false,
		port: 9500
	}
});
