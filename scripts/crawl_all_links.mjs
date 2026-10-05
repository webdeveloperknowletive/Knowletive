// scripts/crawl_all_links.mjs
// Comprehensive Crawler to extract and test all links, images, media, and forms across all routes

const BASE_URL = 'http://localhost:4321';

const pagesToCrawl = [
  '/',
  '/services',
  '/courses',
  '/placement-activities',
  '/internship-jobs',
  '/free-study-material',
  '/contact',
  '/cet',
  '/cet-documents',
  '/privacy',
  '/terms',
  '/courses/banking',
  '/courses/cloud-devops',
  '/courses/data-analysis',
  '/courses/data-science-ai-ml',
  '/courses/digital-marketing',
  '/courses/java-full-stack',
  '/courses/mern-stack',
  '/services/career-admission-counselling',
  '/services/distance-learning',
  '/services/industrial-internship',
  '/services/it-projects-freshers',
  '/services/it-training-placement',
  '/services/overseas-education',
  '/services/vocational-courses'
];

async function crawl() {
  console.log('Starting full site crawl across', pagesToCrawl.length, 'pages...');
  const discoveredHrefs = new Set();
  const discoveredMedia = new Set();
  const brokenLinks = [];
  const brokenMedia = [];
  const hashPlaceholders = [];
  const emptyHrefs = [];

  const brokenAnchors = [];

  for (const pagePath of pagesToCrawl) {
    try {
      const res = await fetch(`${BASE_URL}${pagePath}`);
      if (!res.ok) {
        brokenLinks.push({ page: pagePath, link: pagePath, status: res.status });
        continue;
      }
      const html = await res.text();

      // Extract href attributes
      const hrefRegex = /href=["']([^"']+)["']/g;
      let match;
      while ((match = hrefRegex.exec(html)) !== null) {
        const href = match[1].trim();
        if (href === '#' || href.startsWith('#!')) {
          hashPlaceholders.push({ page: pagePath, href });
        } else if (!href) {
          emptyHrefs.push({ page: pagePath });
        } else if (href.startsWith('#')) {
          const anchorId = href.slice(1);
          if (anchorId && !html.includes(`id="${anchorId}"`) && !html.includes(`id='${anchorId}'`)) {
            brokenAnchors.push({ page: pagePath, anchor: href });
          }
        } else if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          // Contact scheme
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          // External link
        } else {
          discoveredHrefs.add(href);
        }
      }

      // Extract src attributes (images, scripts, media)
      const srcRegex = /(?:src|poster)=["']([^"']+)["']/g;
      while ((match = srcRegex.exec(html)) !== null) {
        const src = match[1].trim();
        if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
          discoveredMedia.add(src);
        }
      }
    } catch (err) {
      console.error(`Error loading page ${pagePath}:`, err.message);
    }
  }

  console.log(`Discovered ${discoveredHrefs.size} unique internal links.`);
  console.log(`Discovered ${discoveredMedia.size} unique media/asset references.`);

  // Test all internal links
  for (const link of discoveredHrefs) {
    // Strip hash anchors for server fetch
    const cleanLink = link.split('#')[0];
    if (!cleanLink) continue; // Pure anchor on same page
    const fullUrl = cleanLink.startsWith('/') ? `${BASE_URL}${cleanLink}` : `${BASE_URL}/${cleanLink}`;
    try {
      const res = await fetch(fullUrl, { method: 'HEAD' });
      if (res.status >= 400) {
        // Double check with GET in case HEAD is not supported
        const getRes = await fetch(fullUrl);
        if (getRes.status >= 400) {
          brokenLinks.push({ link, status: getRes.status });
        }
      }
    } catch (e) {
      brokenLinks.push({ link, error: e.message });
    }
  }

  // Test all media assets
  for (const src of discoveredMedia) {
    const fullUrl = src.startsWith('/') ? `${BASE_URL}${src}` : `${BASE_URL}/${src}`;
    try {
      const res = await fetch(fullUrl, { method: 'HEAD' });
      if (res.status >= 400) {
        const getRes = await fetch(fullUrl);
        if (getRes.status >= 400) {
          brokenMedia.push({ src, status: getRes.status });
        }
      }
    } catch (e) {
      brokenMedia.push({ src, error: e.message });
    }
  }

  console.log('\n--- CRAWL AUDIT REPORT ---');
  console.log(`Empty hrefs found: ${emptyHrefs.length}`);
  if (emptyHrefs.length > 0) console.log(emptyHrefs);

  console.log(`Hash '#' placeholders found: ${hashPlaceholders.length}`);
  if (hashPlaceholders.length > 0) console.log(hashPlaceholders);

  console.log(`Broken internal anchor targets found: ${brokenAnchors.length}`);
  if (brokenAnchors.length > 0) console.log(brokenAnchors);

  console.log(`Broken internal links (404/error): ${brokenLinks.length}`);
  if (brokenLinks.length > 0) console.log(brokenLinks);

  console.log(`Broken media assets (404/error): ${brokenMedia.length}`);
  if (brokenMedia.length > 0) console.log(brokenMedia);

  if (emptyHrefs.length === 0 && hashPlaceholders.length === 0 && brokenAnchors.length === 0 && brokenLinks.length === 0 && brokenMedia.length === 0) {
    console.log('✅ ALL LINKS, ANCHORS, AND ASSETS PASSED WITH 0 BROKEN REFERENCES!');
  }
}

crawl();
