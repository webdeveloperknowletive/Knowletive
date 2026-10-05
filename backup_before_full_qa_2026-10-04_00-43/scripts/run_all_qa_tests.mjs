// scripts/run_all_qa_tests.mjs
// Master QA Test Execution Suite covering Phases 1 to 41
import fs from 'node:fs';

const BASE_URL = 'http://localhost:4321';
let adminCookie = '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runMasterQA() {
  console.log('====================================================');
  console.log('KNOWLETIVE MASTER QA TEST SUITE');
  console.log('====================================================\n');

  // TEST SUITE 1: Route Integrity & Asset Verification
  console.log('--- 1. Testing Route & Asset Integrity ---');
  const routesToTest = [
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
    '/sitemap-index.xml',
    '/courses/data-analysis',
    '/courses/data-science-ai-ml',
    '/courses/mern-stack',
    '/courses/java-full-stack',
    '/courses/cloud-devops',
    '/courses/banking',
    '/courses/digital-marketing',
    '/services/it-training-placement',
    '/services/industrial-internship',
    '/services/it-projects-freshers',
    '/services/overseas-education',
    '/services/distance-learning',
    '/services/vocational-courses',
    '/services/career-admission-counselling'
  ];

  for (const r of routesToTest) {
    try {
      const res = await fetch(`${BASE_URL}${r}`);
      assert(res.status === 200, `Route ${r} returned status 200`);
    } catch (e) {
      assert(false, `Route ${r} failed to load: ${e.message}`);
    }
  }

  // TEST SUITE 2: Media & Poster Assets
  console.log('\n--- 2. Testing Testimonial Videos & Posters (Zero Black Cards) ---');
  const mediaAssets = [
    '/images/knowletive-logo-optimized.png',
    '/images/placements-collage.jpg',
    '/videos/testimonials/posters/priya-sharma.jpg',
    '/videos/testimonials/posters/rahul-mehta.jpg',
    '/videos/testimonials/posters/sneha-desai.jpg',
    '/videos/testimonials/posters/vikram-patil.jpg',
    '/videos/testimonials/session-review-final.mp4',
    '/videos/testimonials/shrushti-review.mp4',
    '/videos/testimonials/certificate-reel.mp4',
    '/videos/testimonials/syllabus-review.mp4'
  ];

  for (const asset of mediaAssets) {
    try {
      const res = await fetch(`${BASE_URL}${asset}`, { method: 'HEAD' });
      assert(res.status === 200, `Media asset ${asset} exists and returns 200`);
    } catch (e) {
      assert(false, `Media asset ${asset} error: ${e.message}`);
    }
  }

  // TEST SUITE 3: RBAC & Route Guarding
  console.log('\n--- 3. Testing RBAC Server-Side Protection ---');
  const unauthRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  const unauthLoc = unauthRes.headers.get('location');
  assert(
    (unauthRes.status === 302 || unauthRes.status === 307) && (unauthLoc === '/' || unauthLoc === `${BASE_URL}/`),
    'Unauthenticated /admin redirects strictly to /'
  );

  const unauthResumes = await fetch(`${BASE_URL}/admin/resumes`, { redirect: 'manual' });
  const unauthResumesLoc = unauthResumes.headers.get('location');
  assert(
    (unauthResumes.status === 302 || unauthResumes.status === 307) && (unauthResumesLoc === '/' || unauthResumesLoc === `${BASE_URL}/`),
    'Unauthenticated /admin/resumes redirects strictly to /'
  );

  const unauthExport = await fetch(`${BASE_URL}/api/exports/candidates`);
  assert(unauthExport.status === 403, 'Anonymous call to /api/exports/candidates returns 403 Forbidden');

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
    body: JSON.stringify({ email: 'admin@knowletive.com', password: 'KnowletiveAdmin2026!' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  assert(loginRes.status === 200 && !!setCookie, 'Admin login succeeded with session token');
  if (setCookie) adminCookie = setCookie.split(';')[0];

  const authAdminRes = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: adminCookie } });
  assert(authAdminRes.status === 200, 'Authenticated admin accesses /admin dashboard');

  // TEST SUITE 4: Form Ingestion to Database
  console.log('\n--- 4. Testing Multi-Form Lead Ingestion ---');

  // A) Contact Form
  const contactForm = new FormData();
  contactForm.append('first_name', 'Rohan');
  contactForm.append('last_name', 'Deshmukh');
  contactForm.append('email', 'rohan.deshmukh@example.com');
  contactForm.append('phone', '+91 98900 11223');
  contactForm.append('program_interest', 'Data Science & AI/ML');
  contactForm.append('message', 'Requesting batch timings and fee structure.');
  contactForm.append('lead_type', 'Contact');
  contactForm.append('source', 'Contact Page Form');

  const contactRes = await fetch(`${BASE_URL}/api/leads`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: contactForm });
  assert(contactRes.status === 201 || contactRes.status === 200, 'Contact form submission successfully saved to DB');

  // B) Enhanced eBook Form
  const ebookForm = new FormData();
  ebookForm.append('full_name', 'Kavita Joshi');
  ebookForm.append('email', 'kavita.joshi@somedomain.in');
  ebookForm.append('phone', '+91 98231 44556');
  ebookForm.append('education', 'B.E. Computer Engineering');
  ebookForm.append('college', 'MIT World Peace University');
  ebookForm.append('graduation_year', '2024');
  ebookForm.append('current_status', 'Fresher');
  ebookForm.append('opportunity_type', 'Job');
  ebookForm.append('course_interest', 'Data Analysis');
  ebookForm.append('preferred_role', 'Data Analyst');
  ebookForm.append('lead_type', 'eBook');
  ebookForm.append('source', 'Homepage eBook CTA');

  const ebookRes = await fetch(`${BASE_URL}/api/leads`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: ebookForm });
  assert(ebookRes.status === 201 || ebookRes.status === 200, 'Enhanced eBook form with qualifications saved to DB');

  // C) Course Inquiry Form
  const courseForm = new FormData();
  courseForm.append('full_name', 'Aditya More');
  courseForm.append('email', 'aditya.more@analytics.org');
  courseForm.append('phone', '+91 98450 33445');
  courseForm.append('course_interest', 'Data Analysis');
  courseForm.append('lead_type', 'Course');
  courseForm.append('source', 'Course Page: Data Analysis');

  const courseRes = await fetch(`${BASE_URL}/api/leads`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: courseForm });
  assert(courseRes.status === 201 || courseRes.status === 200, 'Course-specific inquiry form saved to DB');

  // D) Newsletter Footer Form
  const newsRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
    body: JSON.stringify({
      email: 'newsletter.test@gmail.com',
      first_name: 'Subscriber',
      phone: 'N/A',
      lead_type: 'Other',
      source: 'Newsletter Footer'
    })
  });
  assert(newsRes.status === 201 || newsRes.status === 200, 'Footer newsletter subscription saved to DB');

  // TEST SUITE 5: File Validation, Security & Keyword Matching Engine
  console.log('\n--- 5. Testing File Security & Keyword Matching Engine ---');

  // A) 21MB File rejection
  const bigBuffer = Buffer.alloc(21 * 1024 * 1024, 'a');
  const bigBlob = new Blob([bigBuffer], { type: 'application/pdf' });
  const bigForm = new FormData();
  bigForm.append('resume', bigBlob, 'oversized.pdf');
  bigForm.append('full_name', 'Big File Tester');
  bigForm.append('email', 'big@test.com');
  bigForm.append('phone', '+91 99999 88888');
  bigForm.append('consent', 'on');

  const bigRes = await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: bigForm });
  assert(bigRes.status === 400, 'Files exceeding 20 MB ceiling rejected with HTTP 400');

  // B) Disguised .exe disguised as .pdf rejection
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
  const exeBlob = new Blob([exeBuffer], { type: 'application/pdf' });
  const exeForm = new FormData();
  exeForm.append('resume', exeBlob, 'trojan.pdf');
  exeForm.append('full_name', 'Attacker');
  exeForm.append('email', 'attack@evil.com');
  exeForm.append('phone', '+91 99999 77777');
  exeForm.append('consent', 'on');

  const exeRes = await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: exeForm });
  assert(exeRes.status === 400, 'Disguised executable rejected via binary magic bytes check with HTTP 400');

  // C) Valid Data Analyst Resume Upload
  const resumeText = `
ANANYA ROY
Email: ananya.roy.analytics@gmail.com | Phone: +91 98111 22334 | Location: Pune, Maharashtra
LinkedIn: https://linkedin.com/in/ananya-roy-da | GitHub: https://github.com/ananya-roy

EDUCATION:
Bachelor of Technology in Information Technology
Pune Institute of Computer Technology (PICT) | 2024

PROFESSIONAL SUMMARY:
Analytical and detail-oriented Data Analyst with extensive experience in SQL, Python, Excel, Power BI, and Tableau. 

TECHNICAL SKILLS:
- Data Analysis & Cleaning: Excel, Advanced Excel, Statistics, EDA, MIS Reporting
- Business Intelligence: Power BI, Tableau, Dashboards
- Databases & Programming: SQL, MySQL, Python, Pandas, NumPy
  `;

  const resumeBlob = new Blob([Buffer.from(resumeText, 'utf-8')], { type: 'text/plain' });
  const validForm = new FormData();
  validForm.append('resume', resumeBlob, 'ananya_roy_resume.txt');
  validForm.append('full_name', 'Ananya Roy');
  validForm.append('email', 'ananya.roy.analytics@gmail.com');
  validForm.append('phone', '+91 98111 22334');
  validForm.append('preferred_role', 'Data Analyst');
  validForm.append('experience_level', 'Fresher');
  validForm.append('consent', 'on');

  const validRes = await fetch(`${BASE_URL}/api/resumes/upload`, { method: 'POST', headers: { 'Origin': BASE_URL }, body: validForm });
  const validData = await validRes.json();
  assert(validRes.status === 201 && validData.success, 'Valid resume uploaded and parsed successfully');
  assert(validData.matchedRole === 'Data Analyst', 'Resume correctly classified into Data Analyst role');
  assert(validData.matchScore >= 70, `Keyword Match Score high for Data Analyst (${validData.matchScore}%)`);

  // TEST SUITE 6: Multi-Sheet Excel & CSV Exports
  console.log('\n--- 6. Testing Data Exports (Excel & CSV) ---');
  const candXlsx = await fetch(`${BASE_URL}/api/exports/candidates?format=xlsx`, { headers: { Cookie: adminCookie } });
  const candXlsxBuf = await candXlsx.arrayBuffer();
  assert(candXlsx.status === 200 && candXlsxBuf.byteLength > 5000, `Candidates XLSX generated (${candXlsxBuf.byteLength} bytes)`);

  const candCsv = await fetch(`${BASE_URL}/api/exports/candidates?format=csv`, { headers: { Cookie: adminCookie } });
  const candCsvTxt = await candCsv.text();
  assert(candCsv.status === 200 && candCsvTxt.includes('Ananya Roy'), 'Candidates CSV contains candidate records');

  const leadsXlsx = await fetch(`${BASE_URL}/api/exports/leads?format=xlsx`, { headers: { Cookie: adminCookie } });
  const leadsXlsxBuf = await leadsXlsx.arrayBuffer();
  assert(leadsXlsx.status === 200 && leadsXlsxBuf.byteLength > 5000, `Leads XLSX generated (${leadsXlsxBuf.byteLength} bytes)`);

  const leadsCsv = await fetch(`${BASE_URL}/api/exports/leads?format=csv`, { headers: { Cookie: adminCookie } });
  const leadsCsvTxt = await leadsCsv.text();
  assert(leadsCsv.status === 200 && leadsCsvTxt.includes('Kavita Joshi'), 'Leads CSV contains lead records');

  console.log('\n====================================================');
  console.log(`MASTER QA RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
  console.log('====================================================\n');
}

runMasterQA();
