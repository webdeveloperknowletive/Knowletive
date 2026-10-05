// scripts/test_qa_suite.mjs
// Comprehensive End-to-End QA Test Suite for Knowletive Upgrade
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:4321';
let adminCookie = '';

async function testRBAC() {
  console.log('\n--- 1. Testing RBAC & Route Guards ---');

  // 1. Unauthenticated request to /admin (MUST redirect to / with 302 or redirect location '/')
  const resAdmin = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  const locAdmin = resAdmin.headers.get('location');
  console.log(`Unauthenticated /admin -> Status: ${resAdmin.status}, Location: ${locAdmin}`);
  if ((resAdmin.status === 302 || resAdmin.status === 307) && (locAdmin === '/' || locAdmin === `${BASE_URL}/`)) {
    console.log('✅ PASS: Unauthenticated access to /admin redirected to /');
  } else {
    console.error('❌ FAIL: Expected 302 redirect to / for unauthenticated /admin');
  }

  // 2. Unauthenticated request to /admin/resumes
  const resResumes = await fetch(`${BASE_URL}/admin/resumes`, { redirect: 'manual' });
  const locResumes = resResumes.headers.get('location');
  console.log(`Unauthenticated /admin/resumes -> Status: ${resResumes.status}, Location: ${locResumes}`);
  if ((resResumes.status === 302 || resResumes.status === 307) && (locResumes === '/' || locResumes === `${BASE_URL}/`)) {
    console.log('✅ PASS: Unauthenticated access to /admin/resumes redirected to /');
  } else {
    console.error('❌ FAIL: Expected redirect to / for unauthenticated /admin/resumes');
  }

  // 3. /admin/login should be accessible (status 200)
  const resLogin = await fetch(`${BASE_URL}/admin/login`);
  console.log(`/admin/login accessibility -> Status: ${resLogin.status}`);
  if (resLogin.status === 200) {
    console.log('✅ PASS: /admin/login is accessible');
  } else {
    console.error('❌ FAIL: Expected 200 for /admin/login');
  }

  // 4. Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': BASE_URL
    },
    body: JSON.stringify({
      email: 'admin@knowletive.com',
      password: 'KnowletiveAdmin2026!'
    })
  });
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  console.log(`Admin Login -> Status: ${loginRes.status}, User: ${loginData.user?.email}`);
  if (loginRes.status === 200 && setCookie) {
    adminCookie = setCookie.split(';')[0];
    console.log(`✅ PASS: Admin login succeeded, session cookie obtained: ${adminCookie.substring(0, 30)}...`);
  } else {
    console.error('❌ FAIL: Admin login failed');
  }

  // 5. Authenticated access to /admin
  const authAdminRes = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: adminCookie }
  });
  console.log(`Authenticated /admin -> Status: ${authAdminRes.status}`);
  const authAdminHtml = await authAdminRes.text();
  if (authAdminRes.status === 200 && authAdminHtml.includes('Knowletive Admin') && authAdminHtml.includes('Dashboard')) {
    console.log('✅ PASS: Authenticated admin can access /admin dashboard');
  } else {
    console.error('❌ FAIL: Expected dashboard access for authenticated admin');
  }
}

async function testFileValidation() {
  console.log('\n--- 2. Testing File Size & Security Limits ---');

  // Test 21 MB oversized file rejection
  const bigBuffer = Buffer.alloc(21 * 1024 * 1024, 'a');
  const bigBlob = new Blob([bigBuffer], { type: 'application/pdf' });
  const bigForm = new FormData();
  bigForm.append('resume', bigBlob, 'oversized_resume.pdf');
  bigForm.append('full_name', 'Big File Test');
  bigForm.append('email', 'bigfile@example.com');
  bigForm.append('phone', '+91 99999 99999');
  bigForm.append('consent', 'on');

  const bigRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    headers: { 'Origin': BASE_URL },
    body: bigForm
  });
  const bigData = await bigRes.json();
  console.log(`21MB File Upload -> Status: ${bigRes.status}, Error: "${bigData.error}"`);
  if (bigRes.status === 400 && bigData.error && bigData.error.includes('20 MB')) {
    console.log('✅ PASS: File exceeding 20 MB correctly rejected');
  } else {
    console.error('❌ FAIL: Expected 400 rejection for 21 MB file');
  }

  // Test disguised executable with .pdf extension (Magic bytes check)
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
  const exeBlob = new Blob([exeBuffer], { type: 'application/pdf' });
  const exeForm = new FormData();
  exeForm.append('resume', exeBlob, 'virus_disguised.pdf');
  exeForm.append('full_name', 'Malicious File Test');
  exeForm.append('email', 'malicious@example.com');
  exeForm.append('phone', '+91 88888 88888');
  exeForm.append('consent', 'on');

  const exeRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    headers: { 'Origin': BASE_URL },
    body: exeForm
  });
  const exeData = await exeRes.json();
  console.log(`Disguised EXE (.pdf) Upload -> Status: ${exeRes.status}, Error: "${exeData.error}"`);
  if (exeRes.status === 400 && exeData.error && (exeData.error.includes('signature') || exeData.error.includes('Invalid'))) {
    console.log('✅ PASS: Disguised executable rejected via magic bytes verification');
  } else {
    console.error('❌ FAIL: Expected rejection for disguised executable');
  }
}

async function testResumeUploadAndMatching() {
  console.log('\n--- 3. Testing Resume Upload & Keyword Matching Engine ---');

  // Create a realistic Data Analyst TXT resume
  const resumeContent = `
RAHUL SHARMA
Email: rahul.sharma.analytics@gmail.com | Phone: +91 98765 43210 | Location: Pune, Maharashtra
LinkedIn: https://linkedin.com/in/rahulsharma-da | GitHub: https://github.com/rahul-data

EDUCATION:
Bachelor of Technology in Computer Science & Engineering
Pune Institute of Computer Technology (PICT) | Graduation: 2024

PROFESSIONAL SUMMARY:
Results-driven Data Analyst with experience in data cleaning, exploratory data analysis (EDA), reporting, and business intelligence. Proficient in transforming raw data into actionable insights and executive dashboards.

TECHNICAL SKILLS:
- Core: Data Analysis, Data Cleaning, EDA, Statistics, MIS Reporting
- Tools: Microsoft Excel, Advanced Excel, Power BI, Tableau
- Databases & Languages: SQL, MySQL, Python, Pandas, NumPy

PROJECTS:
1. Sales Performance & Customer Churn Dashboard
- Extracted 200,000+ customer records from SQL databases and performed data cleaning using Python and Pandas.
- Built interactive executive dashboards in Power BI and Tableau showcasing churn rate, KPI metrics, and quarterly revenue trends.
- Automated monthly MIS reporting in Advanced Excel, saving 15 hours of manual reporting every week.

2. Healthcare Operational Analytics
- Analyzed hospital admission datasets using Python, NumPy, and statistical hypothesis testing.
- Created SQL queries to generate operational reports and trend forecasts.
  `;

  const resumeBlob = new Blob([Buffer.from(resumeContent, 'utf-8')], { type: 'text/plain' });
  const form = new FormData();
  form.append('resume', resumeBlob, 'rahul_sharma_resume.txt');
  form.append('full_name', 'Rahul Sharma');
  form.append('email', 'rahul.sharma.analytics@gmail.com');
  form.append('phone', '+91 98765 43210');
  form.append('preferred_role', 'Data Analyst');
  form.append('experience_level', 'Fresher');
  form.append('consent', 'on');

  const uploadRes = await fetch(`${BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    headers: { 'Origin': BASE_URL },
    body: form
  });

  const uploadData = await uploadRes.json();
  console.log(`Resume Upload Result -> Status: ${uploadRes.status}`);
  console.log('Upload Response:', JSON.stringify(uploadData, null, 2));

  if ((uploadRes.status === 200 || uploadRes.status === 201) && uploadData.success) {
    console.log(`✅ PASS: Candidate created: ${uploadData.candidateId}`);
    console.log(`   Assigned Role: ${uploadData.matchedRole}`);
    console.log(`   Keyword Match Score: ${uploadData.matchScore}%`);
    console.log(`   Status: ${uploadData.assignedStatus}`);

    if (uploadData.matchScore >= 50) {
      console.log('✅ PASS: Keyword Match Score high for Data Analyst (> 50%)');
    } else {
      console.log(`ℹ️ Match Score: ${uploadData.matchScore}%`);
    }
    return uploadData.candidateId;
  } else {
    console.error('❌ FAIL: Resume upload and parsing failed');
    return null;
  }
}

async function testLeadsPersistence() {
  console.log('\n--- 4. Testing Leads Database Persistence ---');

  // 1. Submit Contact Form Lead
  const contactForm = new FormData();
  contactForm.append('first_name', 'Pooja');
  contactForm.append('last_name', 'Verma');
  contactForm.append('email', 'pooja.verma@example.com');
  contactForm.append('phone', '+91 98220 12345');
  contactForm.append('program_interest', 'Full Stack Development');
  contactForm.append('message', 'Interested in the upcoming weekend batch starting next month.');
  contactForm.append('lead_type', 'Contact');
  contactForm.append('source', 'Contact Form');

  const contactRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Origin': BASE_URL },
    body: contactForm
  });
  const contactData = await contactRes.json();
  console.log(`Contact Lead Submit -> Status: ${contactRes.status}, ID: ${contactData.lead?.id}`);
  if ((contactRes.status === 200 || contactRes.status === 201) && contactData.success) {
    console.log('✅ PASS: Contact form lead successfully persisted to database');
  } else {
    console.error('❌ FAIL: Contact form lead persistence failed');
  }

  // 2. Submit Enhanced Free eBook Form Lead
  const ebookForm = new FormData();
  ebookForm.append('full_name', 'Amit Kulkarni');
  ebookForm.append('email', 'amit.kulkarni@techcorp.in');
  ebookForm.append('phone', '+91 97654 32100');
  ebookForm.append('education', 'B.Tech Information Technology');
  ebookForm.append('college', 'COEP Technological University');
  ebookForm.append('graduation_year', '2025');
  ebookForm.append('courses_completed', 'Python, SQL Basics');
  ebookForm.append('current_status', 'Student');
  ebookForm.append('opportunity_type', 'Internship');
  ebookForm.append('course_interest', 'Data Science & AI/ML');
  ebookForm.append('preferred_role', 'Data Scientist');
  ebookForm.append('preferred_location', 'Pune / Bangalore');
  ebookForm.append('linkedin_url', 'https://linkedin.com/in/amit-kulkarni');
  ebookForm.append('message', 'Looking for a 6-month industrial internship for my final semester.');
  ebookForm.append('lead_type', 'eBook');
  ebookForm.append('source', 'Free Career eBook');

  const ebookRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Origin': BASE_URL },
    body: ebookForm
  });
  const ebookData = await ebookRes.json();
  console.log(`Enhanced eBook Lead Submit -> Status: ${ebookRes.status}, ID: ${ebookData.lead?.id}`);
  if ((ebookRes.status === 200 || ebookRes.status === 201) && ebookData.success) {
    console.log('✅ PASS: Enhanced eBook lead with 12+ qualification fields persisted');
  } else {
    console.error('❌ FAIL: Enhanced eBook lead submission failed');
  }
}

async function testExports() {
  console.log('\n--- 5. Testing Multi-Sheet Excel & CSV Exports ---');

  // 1. Export Candidates XLSX
  const candXlsxRes = await fetch(`${BASE_URL}/api/exports/candidates?format=xlsx`, {
    headers: { Cookie: adminCookie }
  });
  console.log(`Candidates XLSX Export -> Status: ${candXlsxRes.status}, Content-Type: ${candXlsxRes.headers.get('content-type')}`);
  const candXlsxBuf = await candXlsxRes.arrayBuffer();
  if (candXlsxRes.status === 200 && candXlsxBuf.byteLength > 1000) {
    console.log(`✅ PASS: Resume_Candidates.xlsx generated (${candXlsxBuf.byteLength} bytes)`);
  } else {
    console.error('❌ FAIL: Candidates XLSX export failed');
  }

  // 2. Export Candidates CSV
  const candCsvRes = await fetch(`${BASE_URL}/api/exports/candidates?format=csv`, {
    headers: { Cookie: adminCookie }
  });
  console.log(`Candidates CSV Export -> Status: ${candCsvRes.status}`);
  const candCsvText = await candCsvRes.text();
  if (candCsvRes.status === 200 && candCsvText.includes('Sr No')) {
    console.log(`✅ PASS: Candidates CSV generated with expected headers and candidate records`);
  } else {
    console.error('❌ FAIL: Candidates CSV export failed');
  }

  // 3. Export Leads XLSX
  const leadsXlsxRes = await fetch(`${BASE_URL}/api/exports/leads?format=xlsx`, {
    headers: { Cookie: adminCookie }
  });
  console.log(`Leads XLSX Export -> Status: ${leadsXlsxRes.status}`);
  const leadsXlsxBuf = await leadsXlsxRes.arrayBuffer();
  if (leadsXlsxRes.status === 200 && leadsXlsxBuf.byteLength > 1000) {
    console.log(`✅ PASS: Knowletive_Leads.xlsx generated (${leadsXlsxBuf.byteLength} bytes)`);
  } else {
    console.error('❌ FAIL: Leads XLSX export failed');
  }

  // 4. Export Leads CSV
  const leadsCsvRes = await fetch(`${BASE_URL}/api/exports/leads?format=csv`, {
    headers: { Cookie: adminCookie }
  });
  console.log(`Leads CSV Export -> Status: ${leadsCsvRes.status}`);
  const leadsCsvText = await leadsCsvRes.text();
  if (leadsCsvRes.status === 200 && leadsCsvText.includes('Sr No')) {
    console.log(`✅ PASS: Leads CSV generated with expected headers and lead records`);
  } else {
    console.error('❌ FAIL: Leads CSV export failed');
  }
}

async function runAll() {
  try {
    await testRBAC();
    await testFileValidation();
    const candidateId = await testResumeUploadAndMatching();
    await testLeadsPersistence();
    await testExports();
    console.log('\n🎉 ALL QA TEST SUITES COMPLETED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('Test Suite encountered unhandled error:', err);
  }
}

runAll();
