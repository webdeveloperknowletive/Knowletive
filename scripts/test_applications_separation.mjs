// ============================================================
// Automated QA Test Suite for Job & Internship Applications Separation
// Tests all 5 user scenarios + API validation + RBAC
// ============================================================

import crypto from 'node:crypto';
import fs from 'node:fs';

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'knowletive_super_secure_secret_key_2026_salt_baner_pune';

function getAdminCookie() {
  const payload = {
    userId: 'admin-1',
    email: 'admin@knowletive.com',
    role: 'admin',
    fullName: 'System Admin',
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `knowletive_admin_session=${payloadB64}.${signature}`;
}

function createDummyResumeBlob(filename = 'test_resume.txt', content = 'Resume details: Skills: SQL, Python, AWS, Power BI, Excel.') {
  const buf = Buffer.from(content, 'utf8');
  return new Blob([buf], { type: 'text/plain' });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING JOB & INTERNSHIP APPLICATION SEPARATION QA');
  console.log('====================================================\n');

  const cookie = getAdminCookie();

  // Step 0: Fetch available jobs and internships from API
  console.log('0. Querying active jobs and internships from server...');
  const resInterns = await fetch(`${BASE_URL}/api/admin/internships`, { headers: { Cookie: cookie } });
  const dataInterns = await resInterns.json();
  const internships = Array.isArray(dataInterns) ? dataInterns : (dataInterns.internships || []);

  const resJobs = await fetch(`${BASE_URL}/api/admin/jobs`, { headers: { Cookie: cookie } });
  const dataJobs = await resJobs.json();
  const jobs = Array.isArray(dataJobs) ? dataJobs : (dataJobs.jobs || []);

  if (internships.length < 2) {
    throw new Error(`Expected at least 2 internships in DB, found ${internships.length}`);
  }
  if (jobs.length < 1) {
    throw new Error(`Expected at least 1 job in DB, found ${jobs.length}`);
  }

  const awsInternship = internships.find(i => i.title.toLowerCase().includes('aws')) || internships[0];
  const secondInternship = internships.find(i => i.id !== awsInternship.id) || internships[1];
  const dataAnalystJob = jobs.find(j => j.title.toLowerCase().includes('data')) || jobs[0];

  console.log(`- Target Internship 1: "${awsInternship.title}" (ID: ${awsInternship.id})`);
  console.log(`- Target Internship 2: "${secondInternship.title}" (ID: ${secondInternship.id})`);
  console.log(`- Target Job: "${dataAnalystJob.title}" (ID: ${dataAnalystJob.id})\n`);

  // RBAC Check
  console.log('--- Checking RBAC Security ---');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/applications`);
  if (unauthRes.status === 403 || unauthRes.status === 401) {
    console.log('✅ PASS: Anonymous request to /api/admin/applications rejected with 403/401');
  } else {
    throw new Error(`FAIL: Anonymous access returned status ${unauthRes.status}`);
  }

  // Validation Check: Internship without ID
  console.log('--- Checking Input Validation ---');
  const invalidForm = new FormData();
  invalidForm.append('resume', createDummyResumeBlob(), 'resume.txt');
  invalidForm.append('full_name', 'Invalid Candidate');
  invalidForm.append('email', 'invalid@candidate.local');
  invalidForm.append('phone', '+919999900001');
  invalidForm.append('application_type', 'internship');
  // missing internship_id!

  const valRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    body: invalidForm
  });
  if (valRes.status === 400) {
    console.log('✅ PASS: Internship application without internship_id rejected with HTTP 400');
  } else {
    throw new Error(`FAIL: Missing internship_id should return 400, got ${valRes.status}`);
  }

  // TEST 1: Apply for AWS Internship
  console.log('\n--- TEST 1: Apply for AWS Internship ---');
  const testCandidate1Email = `candidate.intern.${Date.now()}@example.com`;
  const form1 = new FormData();
  form1.append('resume', createDummyResumeBlob(), 'aws_intern_resume.txt');
  form1.append('full_name', 'Rohan Verma');
  form1.append('email', testCandidate1Email);
  form1.append('phone', '+919876543210');
  form1.append('application_type', 'internship');
  form1.append('internship_id', awsInternship.id);
  form1.append('applied_role', awsInternship.title);

  const res1 = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    body: form1
  });
  const data1 = await res1.json();
  if (!res1.ok || !data1.success) {
    throw new Error(`TEST 1 Failed to submit: ${JSON.stringify(data1)}`);
  }
  const app1Id = data1.applicationId;
  const cand1Id = data1.candidateId;
  console.log(`Application 1 created: ${app1Id}, candidate: ${cand1Id}`);

  // Verify: Candidate appears under Admin -> Internships -> AWS -> Applicants
  const awsAppsRes = await fetch(`${BASE_URL}/api/admin/internships/${awsInternship.id}/applications`, {
    headers: { Cookie: cookie }
  });
  const awsAppsData = await awsAppsRes.json();
  const foundInAws = (awsAppsData.applications || []).some(a => a.id === app1Id && a.candidate_id === cand1Id);
  if (!foundInAws) {
    throw new Error(`FAIL: Candidate did not appear under AWS Internship applicants!`);
  }
  console.log('✅ PASS: Candidate appears under Admin → Internships → AWS → Applicants');

  // Verify: Candidate does NOT appear under Admin -> Jobs
  const allJobAppsRes = await fetch(`${BASE_URL}/api/admin/applications?type=job`, {
    headers: { Cookie: cookie }
  });
  const allJobAppsData = await allJobAppsRes.json();
  const foundInJobs = (allJobAppsData.applications || []).some(a => a.id === app1Id);
  if (foundInJobs) {
    throw new Error(`FAIL: Internship application leaked into Admin → Jobs!`);
  }
  console.log('✅ PASS: Internship application does NOT appear under Admin → Jobs');

  // TEST 2: Apply for Data Analyst Job
  console.log('\n--- TEST 2: Apply for Data Analyst Job ---');
  const testCandidate2Email = `candidate.job.${Date.now()}@example.com`;
  const form2 = new FormData();
  form2.append('resume', createDummyResumeBlob(), 'da_job_resume.txt');
  form2.append('full_name', 'Deepak Joshi');
  form2.append('email', testCandidate2Email);
  form2.append('phone', '+919876543222');
  form2.append('application_type', 'job');
  form2.append('job_id', dataAnalystJob.id);
  form2.append('applied_role', dataAnalystJob.title);

  const res2 = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    body: form2
  });
  const data2 = await res2.json();
  if (!res2.ok || !data2.success) {
    throw new Error(`TEST 2 Failed to submit: ${JSON.stringify(data2)}`);
  }
  const app2Id = data2.applicationId;
  const cand2Id = data2.candidateId;
  console.log(`Application 2 created: ${app2Id}, candidate: ${cand2Id}`);

  // Verify: Candidate appears under Admin -> Jobs -> Data Analyst -> Applicants
  const jobAppsRes = await fetch(`${BASE_URL}/api/admin/jobs/${dataAnalystJob.id}/applications`, {
    headers: { Cookie: cookie }
  });
  const jobAppsData = await jobAppsRes.json();
  const foundInDaJob = (jobAppsData.applications || []).some(a => a.id === app2Id && a.candidate_id === cand2Id);
  if (!foundInDaJob) {
    throw new Error(`FAIL: Candidate did not appear under Data Analyst job applicants!`);
  }
  console.log('✅ PASS: Candidate appears under Admin → Jobs → Data Analyst → Applicants');

  // Verify: Candidate does NOT appear under Admin -> Internships
  const allInternAppsRes = await fetch(`${BASE_URL}/api/admin/applications?type=internship`, {
    headers: { Cookie: cookie }
  });
  const allInternAppsData = await allInternAppsRes.json();
  const foundInInternships = (allInternAppsData.applications || []).some(a => a.id === app2Id);
  if (foundInInternships) {
    throw new Error(`FAIL: Job application leaked into Admin → Internships!`);
  }
  console.log('✅ PASS: Job application does NOT appear under Admin → Internships');

  // TEST 3: Same Candidate applies for BOTH (1 Internship + 1 Job)
  console.log('\n--- TEST 3: Same Candidate applies for BOTH (Internship & Job) ---');
  const dualCandidateEmail = `multi.applicant.${Date.now()}@example.com`;
  const dualCandidatePhone = '+919877700011';

  // Submits Internship application
  const form3A = new FormData();
  form3A.append('resume', createDummyResumeBlob(), 'dual_resume_1.txt');
  form3A.append('full_name', 'Pooja Kulkarni');
  form3A.append('email', dualCandidateEmail);
  form3A.append('phone', dualCandidatePhone);
  form3A.append('application_type', 'internship');
  form3A.append('internship_id', awsInternship.id);
  form3A.append('applied_role', awsInternship.title);

  const res3A = await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', body: form3A });
  const data3A = await res3A.json();
  const app3AId = data3A.applicationId;
  const cand3AId = data3A.candidateId;

  // Submits Job application with same candidate email
  const form3B = new FormData();
  form3B.append('resume', createDummyResumeBlob(), 'dual_resume_2.txt');
  form3B.append('full_name', 'Pooja Kulkarni');
  form3B.append('email', dualCandidateEmail);
  form3B.append('phone', dualCandidatePhone);
  form3B.append('application_type', 'job');
  form3B.append('job_id', dataAnalystJob.id);
  form3B.append('applied_role', dataAnalystJob.title);

  const res3B = await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', body: form3B });
  const data3B = await res3B.json();
  const app3BId = data3B.applicationId;
  const cand3BId = data3B.candidateId;

  // Verify: Candidate profile was REUSED (not duplicated)
  if (cand3AId !== cand3BId) {
    throw new Error(`FAIL: Duplicate candidate profiles created! Expected ${cand3AId}, got ${cand3BId}`);
  }
  console.log(`✅ PASS: Single candidate profile reused (Candidate ID: ${cand3AId})`);

  // Verify: 2 separate applications exist
  if (app3AId === app3BId) {
    throw new Error(`FAIL: Applications were overwritten into single ID!`);
  }
  console.log(`✅ PASS: 2 separate application IDs created: Internship (${app3AId}) & Job (${app3BId})`);

  // Verify: One under AWS Internship, One under Data Analyst Job
  const checkInternApps = await fetch(`${BASE_URL}/api/admin/internships/${awsInternship.id}/applications`, { headers: { Cookie: cookie } });
  const checkJobApps = await fetch(`${BASE_URL}/api/admin/jobs/${dataAnalystJob.id}/applications`, { headers: { Cookie: cookie } });
  const internList = (await checkInternApps.json()).applications || [];
  const jobList = (await checkJobApps.json()).applications || [];

  if (!internList.some(a => a.id === app3AId) || !jobList.some(a => a.id === app3BId)) {
    throw new Error('FAIL: Dual applications not found in respective job/internship endpoints');
  }
  console.log('✅ PASS: Applications independently segregated: Internship in Internships, Job in Jobs');

  // TEST 4: Same candidate applies to 2 DIFFERENT Internships
  console.log('\n--- TEST 4: Same candidate applies to 2 Internships ---');
  const intern2CandidateEmail = `multi.intern.${Date.now()}@example.com`;
  const intern2Phone = '+919877700022';

  // Apply to Internship 1 (AWS)
  const form4A = new FormData();
  form4A.append('resume', createDummyResumeBlob(), 'intern1.txt');
  form4A.append('full_name', 'Tanvi Shinde');
  form4A.append('email', intern2CandidateEmail);
  form4A.append('phone', intern2Phone);
  form4A.append('application_type', 'internship');
  form4A.append('internship_id', awsInternship.id);

  const res4A = await (await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', body: form4A })).json();

  // Apply to Internship 2 (Second)
  const form4B = new FormData();
  form4B.append('resume', createDummyResumeBlob(), 'intern2.txt');
  form4B.append('full_name', 'Tanvi Shinde');
  form4B.append('email', intern2CandidateEmail);
  form4B.append('phone', intern2Phone);
  form4B.append('application_type', 'internship');
  form4B.append('internship_id', secondInternship.id);

  const res4B = await (await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', body: form4B })).json();

  if (res4A.candidateId !== res4B.candidateId) {
    throw new Error('FAIL: Separate candidates created for same applicant applying to 2 internships');
  }
  if (res4A.applicationId === res4B.applicationId) {
    throw new Error('FAIL: Application was overwritten instead of creating two application records');
  }
  console.log('✅ PASS: Two distinct application records created for same candidate across 2 internships');

  // TEST 5: Change one application status -> other application status remains unchanged
  console.log('\n--- TEST 5: Independent Status Mutation Verification ---');
  // Update Application 3A (Internship) to 'Shortlisted'
  const patchRes = await fetch(`${BASE_URL}/api/admin/applications`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({
      id: app3AId,
      status: 'Shortlisted',
      notes: 'Strong portfolio in cloud systems'
    })
  });
  const patchData = await patchRes.json();
  if (!patchRes.ok || !patchData.success) {
    throw new Error(`Status update failed: ${JSON.stringify(patchData)}`);
  }
  console.log(`Updated Application 3A (${app3AId}) status to Shortlisted`);

  // Verify: Fetch Application 3B (Job) and ensure it is STILL 'New'
  const app3BVerifyRes = await fetch(`${BASE_URL}/api/admin/applications?jobId=${dataAnalystJob.id}`, { headers: { Cookie: cookie } });
  const app3BVerifyData = await app3BVerifyRes.json();
  const app3BRecord = (app3BVerifyData.applications || []).find(a => a.id === app3BId);

  if (!app3BRecord) {
    throw new Error('Could not find Application 3B');
  }
  if (app3BRecord.status !== 'New') {
    throw new Error(`FAIL: Status mutation leaked! Application 3B status changed to ${app3BRecord.status}, expected 'New'`);
  }
  console.log(`✅ PASS: Application 3B status is independently preserved as '${app3BRecord.status}' (no leakage from Application 3A)`);

  // Dashboard Stats Check
  console.log('\n--- Checking Live Dashboard Counts ---');
  const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, { headers: { Cookie: cookie } });
  const dashData = await dashRes.json();
  console.log(`- Total Resumes/Candidates: ${dashData.totalResumes}`);
  console.log(`- Job Applications: ${dashData.leadTypes?.jobApplications}`);
  console.log(`- Internship Applications: ${dashData.leadTypes?.internshipApplications}`);

  if (dashData.leadTypes?.jobApplications === undefined || dashData.leadTypes?.internshipApplications === undefined) {
    throw new Error('FAIL: Dashboard stats missing separated jobApplications and internshipApplications fields');
  }
  console.log('✅ PASS: Admin dashboard provides real live separated counts for Job Applications and Internship Applications');

  console.log('\n====================================================');
  console.log('ALL 5/5 USER TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
