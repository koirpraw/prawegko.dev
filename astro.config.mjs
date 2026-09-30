// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://prawegko.dev',
  build: {
    format: 'directory',
  },
  legacy: {
    collectionsBackwardsCompat: true,
  },
  integrations: [
    sitemap(),
    mdx(),
  ],
});