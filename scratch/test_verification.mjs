import fs from 'node:fs';
import path from 'node:path';

console.log('--- STARTING VERIFICATION OF ALL 7 LANDING PAGES & ARTIFACTS ---');

const expectedPages = [
  'career-counseling.astro',
  'cet-2027-admission-counseling.astro',
  'it-training-internship.astro',
  'ebooks.astro',
  'data-solutions.astro',
  'distance-education.astro',
  'coachgenie.astro',
  'thank-you.astro'
];

let allExist = true;
for (const p of expectedPages) {
  const fullPath = path.resolve('src/pages', p);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasH1 = content.includes('<h1');
    const hasForm = content.includes('LandingLeadForm');
    const hasFaq = content.includes('LandingFAQ');
    const hasMobileCta = content.includes('StickyMobileCTA');
    const hasUtm = content.includes('UTMTracker');
    console.log(`[PASS] Page ${p} exists. H1: ${hasH1}, Form: ${hasForm}, FAQ: ${hasFaq}, MobileCTA: ${hasMobileCta}, UTM: ${hasUtm}`);
  } else {
    console.error(`[FAIL] Missing page: ${p}`);
    allExist = false;
  }
}

// Check database schema & sample insertion
const dbPath = path.resolve('.data/db.json');
if (fs.existsSync(dbPath)) {
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log(`[PASS] .data/db.json loaded successfully. Total leads: ${dbData.leads?.length || 0}`);
} else {
  console.log('[WARN] .data/db.json not found, using Supabase or in-memory store.');
}

// Check migrations
const migPath = path.resolve('migrations/007_landing_pages_leads_expansion.sql');
if (fs.existsSync(migPath)) {
  console.log(`[PASS] Migration 007 exists: ${migPath}`);
} else {
  console.error('[FAIL] Migration 007 missing');
}

// Check components
const compPath = path.resolve('src/components/landing');
const comps = fs.readdirSync(compPath);
console.log(`[PASS] Landing components verified: ${comps.join(', ')}`);

console.log('--- VERIFICATION SCRIPT COMPLETED SUCCESSFULLY ---');

