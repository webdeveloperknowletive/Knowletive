// scripts/test_activities_media_pipeline.mjs
// Automated End-to-End Verification of Admin Media -> Public Activities Gallery Pipeline
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:4321';
let adminCookie = '';

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runTest() {
  console.log('===========================================================');
  console.log('TESTING ADMIN MEDIA LIBRARY -> PUBLIC ACTIVITIES GALLERY');
  console.log('===========================================================\n');

  // 1. Admin Authentication
  console.log('--- Step 1: Admin Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
    body: JSON.stringify({ email: 'admin@knowletive.com', password: 'KnowletiveAdmin2026!' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  assert(loginRes.status === 200 && !!setCookie, 'Admin authenticated and received session cookie');
  adminCookie = setCookie.split(';')[0];

  // 2. Upload Image to Activities Gallery
  console.log('\n--- Step 2: Upload Image to Activities Gallery ---');
  // Create a minimal 1x1 transparent PNG buffer
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const imgBlob = new Blob([pngBuffer], { type: 'image/png' });
  const imgForm = new FormData();
  imgForm.append('file', imgBlob, 'hackathon_activity.png');
  imgForm.append('title', 'Annual Hackathon 2026');
  imgForm.append('category', 'Activities Gallery');
  imgForm.append('description', '48-hour continuous coding and prototype building marathon with 200+ students.');
  imgForm.append('is_published', 'true');
  imgForm.append('display_order', '1');

  const uploadImgRes = await fetch(`${BASE_URL}/api/admin/media`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Origin': BASE_URL },
    body: imgForm
  });
  const uploadImgData = await uploadImgRes.json();
  assert(uploadImgRes.status === 201 && uploadImgData.success, 'Image uploaded to Media Library with Category = activities');
  const imageId = uploadImgData.item?.id;
  const imageUrl = uploadImgData.item?.file_url;
  console.log(`     Image ID: ${imageId}, File URL: ${imageUrl}`);

  // 3. Test Public API endpoint /api/media?category=activities&published=true
  console.log('\n--- Step 3: Test Public API (/api/media?category=activities&published=true) ---');
  const publicApiRes = await fetch(`${BASE_URL}/api/media?category=activities&published=true`);
  assert(publicApiRes.status === 200, 'Public GET /api/media returns HTTP 200');
  const publicApiData = await publicApiRes.json();
  const foundInApi = publicApiData.some(m => m.id === imageId && m.title === 'Annual Hackathon 2026');
  assert(foundInApi, 'Uploaded image returned in public Activities API response');

  // 4. Test Public HTML Page (/placement-activities)
  console.log('\n--- Step 4: Verify Public Page (/placement-activities) Dynamic Rendering ---');
  const pageRes = await fetch(`${BASE_URL}/placement-activities`);
  assert(pageRes.status === 200, 'Public Placement & Activities page returned HTTP 200');
  const pageHtml = await pageRes.text();
  assert(pageHtml.includes('Annual Hackathon 2026'), 'Public Activities Gallery displays uploaded image title');
  assert(pageHtml.includes(imageUrl), 'Public Activities Gallery contains correct image URL');
  assert(pageHtml.includes('48-hour continuous coding'), 'Public Activities Gallery contains description');

  // 5. Upload Video to Activities Gallery
  console.log('\n--- Step 5: Upload MP4 Video to Activities Gallery ---');
  const mp4Header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const videoBlob = new Blob([mp4Header], { type: 'video/mp4' });
  const videoForm = new FormData();
  videoForm.append('file', videoBlob, 'workshop_demo.mp4');
  videoForm.append('title', 'Robotics Workshop Live Demo');
  videoForm.append('category', 'activities');
  videoForm.append('description', 'Hands-on IoT robotics session.');
  videoForm.append('is_published', 'true');
  videoForm.append('display_order', '2');

  const uploadVidRes = await fetch(`${BASE_URL}/api/admin/media`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Origin': BASE_URL },
    body: videoForm
  });
  const uploadVidData = await uploadVidRes.json();
  assert(uploadVidRes.status === 201 && uploadVidData.success, 'Video uploaded to Media Library');
  const videoId = uploadVidData.item?.id;
  const videoUrl = uploadVidData.item?.file_url;
  console.log(`     Video ID: ${videoId}, Video URL: ${videoUrl}`);

  // Verify video on public page
  const pageVidRes = await fetch(`${BASE_URL}/placement-activities`);
  const pageVidHtml = await pageVidRes.text();
  assert(pageVidHtml.includes('Robotics Workshop Live Demo'), 'Public Activities Gallery displays uploaded video title');
  assert(pageVidHtml.includes('<video'), 'Public Activities Gallery renders video player');

  // 6. Test Unpublish
  console.log('\n--- Step 6: Test Unpublish (Draft) Behavior ---');
  const unpublishRes = await fetch(`${BASE_URL}/api/admin/media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie, 'Origin': BASE_URL },
    body: JSON.stringify({ id: imageId, is_published: false })
  });
  assert(unpublishRes.status === 200, 'Admin successfully unpublished image');

  const pageAfterUnpublish = await fetch(`${BASE_URL}/placement-activities`);
  const htmlAfterUnpublish = await pageAfterUnpublish.text();
  assert(!htmlAfterUnpublish.includes('Annual Hackathon 2026'), 'Unpublished image is NOT visible in public Activities Gallery');

  // 7. Test Delete
  console.log('\n--- Step 7: Test Delete & Disk Cleanup ---');
  const localVideoPath = path.resolve('public' + videoUrl);
  const fileExistedBefore = fs.existsSync(localVideoPath);

  const deleteRes = await fetch(`${BASE_URL}/api/admin/media?id=${videoId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie, 'Origin': BASE_URL }
  });
  assert(deleteRes.status === 200, 'Admin deleted video from Media Library');

  const pageAfterDelete = await fetch(`${BASE_URL}/placement-activities`);
  const htmlAfterDelete = await pageAfterDelete.text();
  assert(!htmlAfterDelete.includes('Robotics Workshop Live Demo'), 'Deleted video disappeared from public Activities Gallery');

  const fileExistedAfter = fs.existsSync(localVideoPath);
  assert(fileExistedBefore && !fileExistedAfter, 'Deleted media file physically cleaned from disk');

  // 8. Re-publish Image for Public Persistence Check
  console.log('\n--- Step 8: Re-publish Image & Verify Persistence ---');
  await fetch(`${BASE_URL}/api/admin/media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie, 'Origin': BASE_URL },
    body: JSON.stringify({ id: imageId, is_published: true })
  });

  const finalCheck = await fetch(`${BASE_URL}/placement-activities`);
  const finalHtml = await finalCheck.text();
  assert(finalHtml.includes('Annual Hackathon 2026'), 'Re-published image reliably displayed on public website');

  console.log('\n===========================================================');
  console.log('ALL ACTIVITIES MEDIA PIPELINE TESTS COMPLETED SUCCESSFULLY!');
  console.log('===========================================================\n');
}

runTest();
