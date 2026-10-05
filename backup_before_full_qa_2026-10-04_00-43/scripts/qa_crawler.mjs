// scripts/qa_crawler.mjs
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:4321';

// 1. Discover all routes in src/pages
function discoverRoutes(dir, baseRoute = '') {
  let routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes = routes.concat(discoverRoutes(fullPath, baseRoute + '/' + entry.name));
    } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      let routeName = entry.name.replace(/\.(astro|ts|js)$/, '');
      if (routeName === 'index') {
        routes.push(baseRoute === '' ? '/' : baseRoute);
      } else {
        routes.push(baseRoute + '/' + routeName);
      }
    }
  }
  return routes;
}

const allRoutes = discoverRoutes('src/pages');
const publicPages = allRoutes.filter(r => !r.startsWith('/api') && !r.includes('[') && !r.startsWith('/admin'));
const adminPages = allRoutes.filter(r => r.startsWith('/admin') && !r.includes('['));
const apiRoutes = allRoutes.filter(r => r.startsWith('/api') && !r.includes('['));

console.log('--- Discovered Routes ---');
console.log(`Public Pages (${publicPages.length}):`, publicPages);
console.log(`Admin Pages (${adminPages.length}):`, adminPages);
console.log(`API Routes (${apiRoutes.length}):`, apiRoutes);

async function crawl() {
  console.log('\n--- Crawling Public Pages & Checking Assets/Links ---');
  const discoveredLinks = new Set();
  const checkedLinks = new Map();
  const checkedAssets = new Map();
  const issues = [];

  for (const pageRoute of publicPages) {
    const url = BASE_URL + pageRoute;
    try {
      const res = await fetch(url);
      console.log(`Checking [${res.status}] ${pageRoute}`);
      if (!res.ok) {
        issues.push({ type: 'PAGE_ERROR', route: pageRoute, status: res.status });
        continue;
      }

      const html = await res.text();

      // Find all <a href="...">
      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1].trim();
        discoveredLinks.add({ source: pageRoute, href });
      }

      // Find all images <img src="...">
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1].trim();
        if (src.startsWith('/') && !src.startsWith('//')) {
          if (!checkedAssets.has(src)) {
            const assetRes = await fetch(BASE_URL + src);
            checkedAssets.set(src, assetRes.status);
            if (!assetRes.ok) {
              issues.push({ type: 'BROKEN_IMAGE', source: pageRoute, asset: src, status: assetRes.status });
            }
          }
        }
      }

      // Find all videos & posters <video src="..." poster="...">
      const videoRegex = /<video[^>]+src=["']([^"']+)["']/gi;
      while ((match = videoRegex.exec(html)) !== null) {
        const src = match[1].trim();
        if (src.startsWith('/') && !src.startsWith('//')) {
          if (!checkedAssets.has(src)) {
            const assetRes = await fetch(BASE_URL + src);
            checkedAssets.set(src, assetRes.status);
            if (!assetRes.ok) {
              issues.push({ type: 'BROKEN_VIDEO', source: pageRoute, asset: src, status: assetRes.status });
            }
          }
        }
      }

      const posterRegex = /poster=["']([^"']+)["']/gi;
      while ((match = posterRegex.exec(html)) !== null) {
        const poster = match[1].trim();
        if (poster.startsWith('/') && !poster.startsWith('//')) {
          if (!checkedAssets.has(poster)) {
            const assetRes = await fetch(BASE_URL + poster);
            checkedAssets.set(poster, assetRes.status);
            if (!assetRes.ok) {
              issues.push({ type: 'BROKEN_POSTER', source: pageRoute, asset: poster, status: assetRes.status });
            }
          }
        }
      }

    } catch (err) {
      issues.push({ type: 'FETCH_FAILED', route: pageRoute, error: err.message });
    }
  }

  console.log(`\nDiscovered ${discoveredLinks.size} total link references across pages.`);
  console.log('Testing internal links...');

  for (const { source, href } of discoveredLinks) {
    // Flag empty, hash, or javascript void
    if (href === '#' || href === '' || href.startsWith('javascript:')) {
      issues.push({ type: 'EMPTY_OR_HASH_HREF', source, href });
      continue;
    }

    // Ignore external URLs, tel:, mailto:
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('tel:') || href.startsWith('mailto:')) {
      continue;
    }

    // Anchor on same page like #testimonials
    if (href.startsWith('#')) {
      continue;
    }

    const cleanPath = href.split('#')[0].split('?')[0];
    if (!cleanPath) continue;

    if (!checkedLinks.has(cleanPath)) {
      try {
        const res = await fetch(BASE_URL + cleanPath, { redirect: 'manual' });
        checkedLinks.set(cleanPath, res.status);
        if (res.status === 404) {
          issues.push({ type: 'BROKEN_INTERNAL_LINK', source, href: cleanPath, status: 404 });
        }
      } catch (err) {
        issues.push({ type: 'LINK_FETCH_ERROR', source, href: cleanPath, error: err.message });
      }
    }
  }

  console.log('\n=============================================');
  console.log(`QA AUDIT CRAWL RESULTS: Found ${issues.length} issues`);
  console.log('=============================================');
  for (const issue of issues) {
    console.log(JSON.stringify(issue));
  }
}

crawl();
