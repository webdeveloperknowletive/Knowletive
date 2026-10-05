// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://knowletive.com',
  output: 'server',
  adapter: vercel(),
  redirects: {
    '/cet.html': '/cet',
    '/cetdocuments.html': '/cet-documents',
    '/capcet.html': '/free-study-material',
    '/pep-program': '/internship-jobs',
    '/process': '/services',
    '/resources': '/free-study-material',
    '/reviews': '/#testimonials',
    '/about': '/'
  },
  security: {
    checkOrigin: false
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/.data/**', '**/backup_*/**', '**/dist/**', '**/public/uploads/**']
      }
    }
  },
  integrations: [react(), sitemap()]
});