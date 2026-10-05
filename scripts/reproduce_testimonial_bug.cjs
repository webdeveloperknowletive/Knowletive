const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const secret = process.env.ADMIN_SESSION_SECRET || 'knowletive_super_secure_secret_key_2026_salt_baner_pune';
const payload = {
  userId: 'admin-1',
  email: 'admin@knowletive.com',
  role: 'admin',
  fullName: 'Administrator',
  exp: Math.floor(Date.now() / 1000) + 86400
};
const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
const token = b64 + '.' + sig;

(async () => {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    await context.addCookies([{
      name: 'knowletive_admin_session',
      value: token,
      domain: 'localhost',
      path: '/'
    }]);

    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    page.on('dialog', async dialog => {
      console.log('DIALOG ALERT:', dialog.message());
      await dialog.accept();
    });

    page.on('request', req => {
      if (req.url().includes('/api/admin/testimonials')) {
        console.log('API REQ:', req.method(), req.url());
      }
    });

    page.on('response', async res => {
      if (res.url().includes('/api/admin/testimonials')) {
        console.log('API RES:', res.status(), res.url());
        try {
          console.log('API RES BODY:', await res.text());
        } catch (e) {}
      }
    });

    await page.goto('http://localhost:4321/admin/testimonials', { waitUntil: 'networkidle' });
    console.log('Admin page loaded!');

    // Click 'Add Story Reel' button
    await page.click('#open-add-testi-modal');
    console.log('Modal opened!');

    // 1. Fill student name & program
    await page.fill('#testi-name', 'Rohan Kulkarni');
    await page.fill('#testi-program', 'MERN Stack Development');
    await page.fill('#testi-caption', 'Placed as Full Stack Developer at Pune tech hub.');

    // 2. Select an MP4 video file
    // Let's create a dummy MP4 or use existing one
    const videoSourcePath = path.resolve('public/videos/testimonials/session-review-final.mp4');
    await page.setInputFiles('#testi-video-file', videoSourcePath);

    // 3. Select a JPG poster file
    const posterSourcePath = path.resolve('public/videos/testimonials/posters/priya-sharma.jpg');
    await page.setInputFiles('#testi-poster-file', posterSourcePath);

    console.log('Form inputs ready, clicking Save & Publish...');
    await page.click('#save-testi-btn');

    // Wait for response or reload
    await page.waitForTimeout(4000);

    // Now check if Rohan Kulkarni is on /admin/testimonials
    await page.goto('http://localhost:4321/admin/testimonials', { waitUntil: 'networkidle' });
    const adminContent = await page.content();
    console.log('Admin contains Rohan Kulkarni?', adminContent.includes('Rohan Kulkarni'));

    // Check if Rohan Kulkarni is on public homepage
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    const homeContent = await page.content();
    console.log('Homepage contains Rohan Kulkarni?', homeContent.includes('Rohan Kulkarni'));

    await browser.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
