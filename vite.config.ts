import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// One build: the React SPA (client) + the Worker and its Durable Object.
// `vite` runs both locally with the real workerd runtime; `vite build` emits
// dist/ ready for `wrangler deploy`.
export default defineConfig({
    plugins: [react(), cloudflare()],
});
