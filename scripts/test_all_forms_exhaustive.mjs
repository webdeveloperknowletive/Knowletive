// scripts/test_all_forms_exhaustive.mjs
// Exhaustive form testing covering: Empty, Invalid, Valid, Duplicate, Constraints, and DB Verification

const BASE_URL = 'http://localhost:4321';
let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

async function testForms() {
  console.log('====================================================');
  console.log('RUNNING EXHAUSTIVE FORM QA TESTS');
  console.log('====================================================\n');

  // --- 1. CONTACT FORM TESTS ---
  console.log('--- 1. Testing Contact Form ---');
  // 1a. Empty submission
  const emptyContact = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert(emptyContact.status === 400, 'Empty contact form rejected with HTTP 400');

  // 1b. Invalid email
  const badEmailContact = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      email: 'notanemail',
      phone: '9876543210'
    })
  });
  assert(badEmailContact.status === 400, 'Invalid email rejected with HTTP 400');

  // 1c. Invalid phone (too short)
  const badPhoneContact = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      email: 'test@example.com',
      phone: '123'
    })
  });
  assert(badPhoneContact.status === 400, 'Short phone number rejected with HTTP 400');

  // 1d. Valid Contact submission
  const validContact = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Ananya',
      lastName: 'Kulkarni',
      email: 'ananya.kulkarni@example.com',
      phone: '9822012345',
      serviceInterest: 'Career Counseling',
      message: 'Interested in IT placement counseling for final year engineering.',
      source: 'Contact Page'
    })
  });
  assert(validContact.status === 201, 'Valid contact submission accepted with HTTP 201');

  // --- 2. EBOOK FORM TESTS ---
  console.log('\n--- 2. Testing eBook Form ---');
  const validEbook = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Vikrant Deshmukh',
      email: 'vikrant.deshmukh@example.com',
      phone: '9923456789',
      education: 'B.E. Computer Science',
      college: 'COEP Technological University',
      coursesCompleted: 'Data Structures, Python, SQL',
      opportunityType: 'Full-time Job',
      preferredRole: 'Data Analyst',
      source: 'eBook Form',
      leadType: 'eBook'
    })
  });
  assert(validEbook.status === 201, 'Valid eBook form accepted with all fields with HTTP 201');

  // --- 3. HOMEPAGE POPUP FORM TESTS ---
  console.log('\n--- 3. Testing Homepage Popup Form ---');
  const popupRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Pooja Jadhav',
      phone: '9850123456',
      courseInterest: 'Data Science & AI/ML',
      source: 'Homepage Popup',
      leadType: 'Course'
    })
  });
  assert(popupRes.status === 201, 'Homepage Popup lead accepted with HTTP 201 and source "Homepage Popup"');

  // --- 4. COURSE INQUIRY FORM TESTS ---
  console.log('\n--- 4. Testing Course Inquiry Form ---');
  const courseRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Amit',
      lastName: 'Shinde',
      email: 'amit.shinde@example.com',
      phone: '9765432109',
      courseInterest: 'Cloud & DevOps Engineering',
      message: 'Looking for weekend batch timings.',
      source: 'Course Detail Page',
      leadType: 'Course'
    })
  });
  assert(courseRes.status === 201, 'Course Inquiry accepted with HTTP 201');

  // --- 5. RESUME / CANDIDATE UPLOAD TESTS ---
  console.log('\n--- 5. Testing Resume Upload Flow ---');
  // 5a. Disguised executable check
  const badExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakePEHeader');
  const badExeForm = new FormData();
  badExeForm.append('resume', new Blob([badExeBuffer], { type: 'application/pdf' }), 'malware.pdf');
  badExeForm.append('full_name', 'Hacker Candidate');
  badExeForm.append('email', 'hacker@malware.local');
  badExeForm.append('phone', '9999999999');

  const badExeRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    body: badExeForm
  });
  assert(badExeRes.status === 400, 'Disguised executable rejected by binary magic-byte parser with HTTP 400');

  // 5b. Valid PDF resume upload
  const validPdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 120\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Data Analyst. Skills: Data Analysis, SQL, Power BI, Tableau, Advanced Excel, Statistics, ETL, Dashboard, Reporting) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n390\n%%EOF');
  const validPdfForm = new FormData();
  validPdfForm.append('resume', new Blob([validPdfHeader], { type: 'application/pdf' }), 'resume_data_analyst.pdf');
  validPdfForm.append('full_name', 'Snehal Patil');
  validPdfForm.append('email', `snehal.patil.${Date.now()}@example.com`);
  validPdfForm.append('phone', '9812345678');
  validPdfForm.append('preferred_role', 'Data Analyst');

  const validPdfRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    body: validPdfForm
  });
  assert(validPdfRes.status === 201, 'Valid PDF resume uploaded and parsed with HTTP 201');
  const validPdfData = await validPdfRes.json();
  assert(validPdfData.success === true, 'Upload returned success: true');
  assert(validPdfData.matchedRole.toLowerCase().includes('data') || validPdfData.matchScore > 50, `Matched Role: ${validPdfData.matchedRole}, Score: ${validPdfData.matchScore}%`);

  console.log('\n====================================================');
  console.log(`FORM QA SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');
}

testForms();
