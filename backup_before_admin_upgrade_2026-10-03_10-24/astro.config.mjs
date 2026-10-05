// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://knowletive.com',
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
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap()]
});