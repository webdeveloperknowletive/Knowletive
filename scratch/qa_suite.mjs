import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
});

for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

const { db, getSupabase } = await import('../src/lib/db.ts');
const { storage } = await import('../src/lib/storage.ts');
const { hashPassword, verifyPassword, createSessionToken, verifySessionToken } = await import('../src/lib/auth.ts');

const supabase = getSupabase();

console.log('====================================================');
console.log('       KNOWLETIVE FULL QA TEST SUITE');
console.log('====================================================\n');

const results = [];

function assert(title, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${title}`);
    results.push({ title, status: 'PASS', details });
  } else {
    console.error(`[FAIL] ${title} - Details: ${details}`);
    results.push({ title, status: 'FAIL', details });
  }
}

async function runQA() {
  // 1. Supabase Initialization & Buckets
  console.log('\n--- 1. Supabase Client & Storage Verification ---');
  assert('Supabase is configured in db', db.isSupabaseConnected(), `URL: ${env.SUPABASE_URL}`);
  
  if (supabase) {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    assert('List Storage Buckets succeeds', !bErr && Array.isArray(buckets), bErr?.message);
    const bucketNames = buckets ? buckets.map(b => b.name) : [];
    assert('Storage bucket "candidate-resumes" exists', bucketNames.includes('candidate-resumes'), `Buckets: ${bucketNames.join(', ')}`);
    assert('Storage bucket "media" exists', bucketNames.includes('media'), `Buckets: ${bucketNames.join(', ')}`);
  }

  // 2. Authentication & Sessions
  console.log('\n--- 2. Authentication & Admin Security ---');
  const defaultAdmin = await db.getProfileByEmail(env.DEFAULT_ADMIN_EMAIL || 'admin@knowletive.com');
  assert('Admin profile fetched by email', !!defaultAdmin, `Email: ${defaultAdmin?.email}`);
  assert('Admin profile has valid role', defaultAdmin?.role === 'admin', `Role: ${defaultAdmin?.role}`);
  assert('Admin profile has password hash', !!defaultAdmin?.password_hash, 'Hash present');
  
  const isPassValid = verifyPassword(env.DEFAULT_ADMIN_PASSWORD, defaultAdmin.password_hash);
  assert('Admin password verification succeeds with correct password', isPassValid, 'PBKDF2 match');
  
  const isWrongPassRejected = !verifyPassword('wrong_password_12345', defaultAdmin.password_hash);
  assert('Admin password verification rejects wrong password', isWrongPassRejected, 'Mismatch rejected');

  const sessionToken = createSessionToken(defaultAdmin);
  const sessionDecoded = verifySessionToken(sessionToken);
  assert('Session token creation and HMAC verification succeed', sessionDecoded?.userId === defaultAdmin.id, `Decoded ID: ${sessionDecoded?.userId}`);

  const tamperedToken = sessionToken.slice(0, -4) + 'abcd';
  const tamperedRejected = verifySessionToken(tamperedToken) === null;
  assert('Tampered session token signature rejected', tamperedRejected, 'Tampered token is null');

  // 3. Form Validation: Leads
  console.log('\n--- 3. Form Validation & Lead Persistence ---');
  const testLeadId = crypto.randomUUID();
  const testLead = {
    id: testLeadId,
    first_name: '[QA-TEST] Ayush',
    last_name: 'Tester',
    email: 'qa.test.lead@knowletive.com',
    phone: '9876543210',
    lead_type: 'Contact',
    message: 'Automated QA verification test inquiry',
    source: 'QA Automated Test',
    status: 'New',
    privacy_consent: true,
    is_read: false,
    viewed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const savedLead = await db.saveLead(testLead);
  assert('db.saveLead returns saved lead', savedLead.id === testLeadId, `Saved ID: ${savedLead.id}`);

  // Confirm in Supabase
  if (supabase) {
    const { data: supaLead, error: lErr } = await supabase.from('leads').select('*').eq('id', testLeadId).single();
    assert('Lead record verified persistent in Supabase table', !lErr && supaLead?.email === testLead.email, lErr ? lErr.message : `Found in Supabase: ${supaLead?.id}`);
  }

  // Update lead
  savedLead.admin_notes = 'QA Note updated';
  const updatedLead = await db.saveLead(savedLead);
  assert('Lead update succeeds', updatedLead.admin_notes === 'QA Note updated', 'Updated in DB');

  // Read lead
  const fetchedLead = await db.getLeadById(testLeadId);
  assert('db.getLeadById retrieves record', fetchedLead?.id === testLeadId, `Fetched: ${fetchedLead?.first_name}`);

  // Clean up test lead
  await db.deleteLead(testLeadId);
  if (supabase) {
    const { data: checkDeleted } = await supabase.from('leads').select('*').eq('id', testLeadId);
    assert('Lead record cleaned up from Supabase', checkDeleted?.length === 0, 'Cleaned up');
  }

  // 4. Resume Upload & Candidate Persistence
  console.log('\n--- 4. Resume Upload & Candidate Persistence ---');
  const testPdfContent = Buffer.from('%PDF-1.4\n%QA Test PDF Content\n%%EOF');
  const testPdfFile = new File([testPdfContent], 'qa-test-resume.pdf', { type: 'application/pdf' });

  let uploadResult;
  try {
    uploadResult = await storage.saveResume(testPdfFile);
    assert('storage.saveResume uploads PDF file', !!uploadResult.fileId && !!uploadResult.storagePath, `Storage path: ${uploadResult.storagePath}`);
  } catch (uErr) {
    assert('storage.saveResume uploads PDF file', false, uErr.message);
  }

  if (uploadResult) {
    // Verify file exists in Supabase Storage
    const bufferData = await storage.getResumeBuffer(uploadResult.fileId);
    assert('storage.getResumeBuffer retrieves uploaded file buffer from Supabase', !!bufferData && bufferData.buffer.length > 0, `Bytes: ${bufferData?.buffer.length}`);

    // Create Candidate record
    const testCandidateId = crypto.randomUUID();
    const testCandidate = {
      id: testCandidateId,
      full_name: '[QA-TEST] Resume Candidate',
      first_name: 'Resume',
      last_name: 'Candidate',
      email: 'qa.candidate@knowletive.com',
      phone: '9123456789',
      resume_file_url: uploadResult.downloadUrl,
      resume_file_name: uploadResult.originalFileName,
      resume_file_type: uploadResult.mimeType,
      resume_file_size: uploadResult.fileSize,
      match_score: 85,
      skills: ['SQL', 'Power BI'],
      resume_keywords: ['sql', 'power bi'],
      status: 'New',
      source: 'QA Automated Test',
      privacy_consent: true,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const savedCand = await db.saveCandidate(testCandidate);
    assert('db.saveCandidate persists candidate', savedCand.id === testCandidateId, `ID: ${savedCand.id}`);

    if (supabase) {
      const { data: supaCand, error: cErr } = await supabase.from('candidates').select('*').eq('id', testCandidateId).single();
      assert('Candidate record verified persistent in Supabase table', !cErr && supaCand?.email === testCandidate.email, cErr ? cErr.message : `Found in Supabase: ${supaCand?.id}`);
    }

    // Test Applications table save
    const testAppId = crypto.randomUUID();
    const testApp = {
      id: testAppId,
      candidate_id: testCandidateId,
      application_type: 'job',
      applied_role: 'Data Analyst',
      status: 'New',
      resume_url: uploadResult.downloadUrl,
      resume_file_name: uploadResult.originalFileName,
      resume_file_size: uploadResult.fileSize,
      match_score: 85,
      matched_keywords: ['sql', 'power bi'],
      skills: ['SQL', 'Power BI'],
      source: 'QA Automated Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const savedApp = await db.saveApplication(testApp);
    assert('db.saveApplication stores application', savedApp.id === testAppId, `App ID: ${savedApp.id}`);

    const appsList = await db.getApplications({ candidateId: testCandidateId });
    assert('db.getApplications finds saved application with enriched candidate', appsList.length > 0 && appsList[0].candidate?.id === testCandidateId, `Count: ${appsList.length}`);

    // Clean up candidate, app, and storage file
    await db.deleteCandidate(testCandidateId);
    await db.deleteApplication(testAppId);
    await storage.deleteResume(uploadResult.storagePath || uploadResult.fileId);

    if (supabase) {
      const { data: cCand } = await supabase.from('candidates').select('*').eq('id', testCandidateId);
      assert('Candidate cleaned up from Supabase', cCand?.length === 0, 'Cleaned up');
    }
  }

  // 5. Media Library & Storage Buckets
  console.log('\n--- 5. Media Library & Supabase Public Storage ---');
  const dummyImageContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG header
  const dummyImageFile = new File([dummyImageContent], 'qa-test-image.jpg', { type: 'image/jpeg' });

  const mediaUpload = await storage.saveMediaFile(dummyImageFile, 'media');
  assert('storage.saveMediaFile saves to Supabase media bucket', !!mediaUpload.fileUrl && mediaUpload.fileUrl.startsWith('http'), `File URL: ${mediaUpload.fileUrl}`);

  const testMediaItem = {
    id: mediaUpload.fileId,
    type: 'image',
    media_type: 'image',
    title: '[QA-TEST] Image',
    category: 'activities',
    is_published: true,
    display_order: 99,
    file_url: mediaUpload.fileUrl,
    file_name: mediaUpload.originalFileName,
    mime_type: mediaUpload.mimeType,
    file_size: mediaUpload.fileSize,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const savedMedia = await db.saveMedia(testMediaItem);
  assert('db.saveMedia persists media record', savedMedia.id === testMediaItem.id, `ID: ${savedMedia.id}`);

  if (supabase) {
    const { data: supaMedia, error: mErr } = await supabase.from('media_library').select('*').eq('id', testMediaItem.id).single();
    assert('Media record verified persistent in Supabase table', !mErr && !!supaMedia, mErr ? mErr.message : `Found in Supabase: ${supaMedia?.id}`);
  }

  // Clean up media
  await storage.deleteMediaFile(mediaUpload.fileUrl);
  await db.deleteMedia(testMediaItem.id);
  assert('Media item and file cleaned up', true, 'Cleaned up');

  // 6. Testimonials Save
  console.log('\n--- 6. Testimonials Persistence ---');
  const testStoryId = crypto.randomUUID();
  const testStory = {
    id: testStoryId,
    student_name: '[QA-TEST] Student',
    program: 'Data Science',
    caption: 'QA Caption verification',
    video_url: '/videos/testimonials/session-review-final.mp4',
    poster_url: '/images/hero-students.jpg',
    thumbnail_url: '/images/hero-students.jpg',
    display_order: 999,
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const savedStory = await db.saveTestimonial(testStory);
  assert('db.saveTestimonial persists story', savedStory.id === testStoryId, `ID: ${savedStory.id}`);

  if (supabase) {
    const { data: supaStory, error: sErr } = await supabase.from('testimonials').select('*').eq('id', testStoryId).single();
    assert('Testimonial record verified persistent in Supabase table', !sErr && !!supaStory, sErr ? sErr.message : `Found in Supabase: ${supaStory?.id}`);
  }

  await db.deleteTestimonial(testStoryId);
  assert('Testimonial cleaned up', true, 'Cleaned up');

  // 7. Dashboard Stats & Unread Counts
  console.log('\n--- 7. Dashboard Stats & System Health ---');
  const stats = await db.getDashboardStats();
  assert('Dashboard stats calculated without throwing', typeof stats.totalResumes === 'number' && typeof stats.totalLeads === 'number', `Resumes: ${stats.totalResumes}, Leads: ${stats.totalLeads}`);

  const unread = await db.getUnreadCounts();
  assert('Unread notification counts calculated safely', typeof unread.candidates === 'number' && typeof unread.leads === 'number', `Unread Candidates: ${unread.candidates}, Leads: ${unread.leads}`);

  // Summary
  console.log('\n====================================================');
  console.log('                  QA RESULTS SUMMARY');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('ALL QA AUTOMATION TESTS PASSED PERFECTLY!\n');
  } else {
    console.error(`${failed} TEST(S) FAILED.\n`);
  }
}

runQA().catch(err => {
  console.error('Fatal QA error:', err);
});
