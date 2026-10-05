// scripts/playwright_e2e_qa.mjs
// Comprehensive Playwright End-to-End Test Suite
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:4321';
const SCREENSHOT_DIR = path.resolve('scripts/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runBrowserQA() {
  console.log('====================================================');
  console.log('STARTING PLAYWRIGHT END-TO-END BROWSER SUITE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });

  const routes = [
    { path: '/', name: 'home' },
    { path: '/services', name: 'services' },
    { path: '/courses', name: 'courses' },
    { path: '/placement-activities', name: 'placements' },
    { path: '/internship-jobs', name: 'internships-jobs' },
    { path: '/free-study-material', name: 'study-material' },
    { path: '/contact', name: 'contact' }
  ];

  const viewports = [
    { width: 1440, height: 900, label: '1440px-desktop' },
    { width: 768, height: 1024, label: '768px-tablet' },
    { width: 390, height: 844, label: '390px-mobile' },
    { width: 320, height: 568, label: '320px-small-mobile' }
  ];

  // 1. PUBLIC ROUTES RESPONSIVENESS & CONSOLE CHECK
  console.log('--- 1. Testing Public Routes & Mobile Viewports ---');
  for (const vp of viewports) {
    console.log(`\n  >> Testing Viewport: ${vp.label} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected favicon or intentional 404 test log
        if (!text.includes('favicon') && !text.includes('Failed to load resource: the server responded with a status of 404')) {
          consoleErrors.push(text);
        }
      }
    });

    for (const r of routes) {
      const response = await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
      assert(response.status() === 200, `Page ${r.path} loaded with HTTP 200 on ${vp.label}`);

      // Check horizontal overflow (no sideways scrolling)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert(!hasHorizontalOverflow, `No horizontal overflow on ${r.path} at ${vp.width}px`);

      // Capture screenshot at 1440px and 390px
      if (vp.width === 1440 || vp.width === 390) {
        const screenshotPath = path.join(SCREENSHOT_DIR, `${r.name}_${vp.width}px.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }
    }

    assert(consoleErrors.length === 0, `Zero unexpected console errors on ${vp.label} (${consoleErrors.length} found)`);
    await context.close();
  }

  // 2. ADMIN RBAC BROWSER TEST
  console.log('\n--- 2. Testing Admin RBAC in Real Browser ---');
  const rbacContext = await browser.newContext();
  const rbacPage = await rbacContext.newPage();

  // Try accessing /admin without login
  await rbacPage.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
  const finalUrl = rbacPage.url();
  assert(finalUrl === `${BASE_URL}/` || finalUrl === `${BASE_URL}`, 'Unauthenticated browser access to /admin redirects to Home (/)');

  // Try accessing /admin/resumes directly
  await rbacPage.goto(`${BASE_URL}/admin/resumes`, { waitUntil: 'domcontentloaded' });
  const resumeUrl = rbacPage.url();
  assert(resumeUrl === `${BASE_URL}/` || resumeUrl === `${BASE_URL}`, 'Unauthenticated access to /admin/resumes redirects to Home (/)');

  // 3. ADMIN LOGIN & DASHBOARD VERIFICATION
  console.log('\n--- 3. Testing Admin Login & Dashboard in Browser ---');
  await rbacPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
  assert(rbacPage.url().includes('/admin/login'), 'Admin login page loaded');

  // Fill in credentials
  await rbacPage.fill('input[name="email"]', 'admin@knowletive.com');
  await rbacPage.fill('input[name="password"]', 'KnowletiveAdmin2026!');
  await rbacPage.click('button[type="submit"]');

  // Wait for redirect to /admin
  await rbacPage.waitForURL('**/admin', { timeout: 10000 });
  assert(rbacPage.url().includes('/admin'), 'Admin logged in and redirected to /admin dashboard');

  // Verify dashboard Live Operational Metrics header is visible
  const dashboardHeading = await rbacPage.textContent('h2');
  assert(dashboardHeading.includes('Live Operational Metrics') || dashboardHeading.includes('Metrics'), 'Admin Dashboard renders live operational metrics header');

  // Screenshot admin dashboard
  await rbacPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_dashboard_1440px.png') });

  // 4. DIRECT REFRESH TEST
  console.log('\n--- 4. Testing Direct Refresh on Key Routes ---');
  const refreshContext = await browser.newContext();
  const refreshPage = await refreshContext.newPage();

  for (const r of routes) {
    await refreshPage.goto(`${BASE_URL}${r.path}`);
    const resAfterRefresh = await refreshPage.reload();
    assert(resAfterRefresh.status() === 200, `Direct reload on ${r.path} succeeded with HTTP 200`);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`PLAYWRIGHT TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');
}

runBrowserQA();
