// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://git-vault.kohkimakimoto.dev',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
