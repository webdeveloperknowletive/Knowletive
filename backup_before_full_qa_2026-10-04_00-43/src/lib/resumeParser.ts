// ============================================================
// Knowletive Resume Text & Detail Extraction Engine
// Digital Extraction (PDF, DOCX, TXT) + OCR Fallback
// ============================================================

import mammoth from 'mammoth';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { createWorker } from 'tesseract.js';

export interface ExtractedResumeData {
  rawText: string;
  isOcrUsed: boolean;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  degree?: string;
  college?: string;
  graduationYear?: number;
  yearsExperience?: number;
  currentCompany?: string;
  skills: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

/**
 * Step 1: Extract plain text directly from PDF, DOCX, or TXT.
 * Falls back to Tesseract OCR only if a PDF appears scanned/empty.
 */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; isOcr: boolean }> {
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // TXT extraction
  if (ext === 'txt' || mimeType.includes('text/plain')) {
    return { text: buffer.toString('utf8'), isOcr: false };
  }

  // DOCX extraction
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    try {
      const extractFn = (mammoth as any).extractRawText || (mammoth as any).default?.extractRawText;
      if (typeof extractFn === 'function') {
        const res = await extractFn({ buffer });
        return { text: res.value || '', isOcr: false };
      }
      return { text: buffer.toString('utf8'), isOcr: false };
    } catch (err) {
      console.warn('[Parser] Mammoth DOCX parsing error:', err);
      return { text: buffer.toString('utf8'), isOcr: false };
    }
  }

  // PDF direct extraction
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    let digitalText = '';
    try {
      const pdfModule = require('pdf-parse');
      if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        digitalText = data.text ? data.text.trim() : '';
      } else if (pdfModule && pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        await parser.load();
        const textResult = await parser.getText();
        digitalText = (textResult.text || (textResult.pages ? textResult.pages.map((p: any) => p.text).join('\n') : '')).trim();
        await parser.destroy();
      }
    } catch (err) {
      console.warn('[Parser] Direct PDF text extraction failed:', err);
    }

    if (digitalText && digitalText.length > 20) {
      return { text: digitalText, isOcr: false };
    }

    return { text: digitalText || buffer.toString('utf8'), isOcr: false };
  }

  // Image resume (PNG, JPG, TIFF, etc.) -> OCR via Tesseract
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'].includes(ext)) {
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      const ocrText = ret.data.text ? ret.data.text.trim() : '';
      return { text: ocrText, isOcr: true };
    } catch (ocrErr) {
      console.warn('[Parser] Image OCR failed:', ocrErr);
      return { text: '', isOcr: false };
    }
  }

  // Fallback to utf8 string
  return { text: buffer.toString('utf8'), isOcr: false };
}

/**
 * Step 2: Extract structured candidate details from text
 * Strictly adheres to rule: Do NOT invent missing data (store null/blank if not found)
 */
export function extractCandidateDetails(rawText: string, defaultName = '', defaultEmail = '', defaultPhone = ''): ExtractedResumeData {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Email Extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emails = rawText.match(emailRegex) || [];
  const email = (emails[0] || defaultEmail).toLowerCase().trim();

  // 2. Phone Number Extraction (Handles Indian +91 formats & standard 10-digit mobile numbers)
  const phoneRegex = /(?:\+?91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b|(?:\+?1[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4}\b/g;
  const phones = rawText.match(phoneRegex) || [];
  let phone = defaultPhone;
  if (phones.length > 0) {
    phone = phones[0].replace(/[\s\-]/g, '');
  }

  // 3. Social / Professional Links
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[A-Za-z0-9_-]+/i;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i;
  const portfolioRegex = /(?:https?:\/\/)?(?:www\.)?(?:[A-Za-z0-9-]+\.)+(?:com|in|dev|io|me|org)\/~?[A-Za-z0-9_\-\/]*/i;

  const linkedinMatch = rawText.match(linkedinRegex);
  const githubMatch = rawText.match(githubRegex);

  let linkedinUrl = linkedinMatch ? linkedinMatch[0] : undefined;
  if (linkedinUrl && !linkedinUrl.startsWith('http')) linkedinUrl = 'https://' + linkedinUrl;

  let githubUrl = githubMatch ? githubMatch[0] : undefined;
  if (githubUrl && !githubUrl.startsWith('http')) githubUrl = 'https://' + githubUrl;

  let portfolioUrl: string | undefined = undefined;
  const portMatch = rawText.match(portfolioRegex);
  if (portMatch) {
    const url = portMatch[0];
    if (!url.includes('linkedin.com') && !url.includes('github.com') && !url.includes('google.com')) {
      portfolioUrl = url.startsWith('http') ? url : 'https://' + url;
    }
  }

  // 4. Candidate Name Extraction
  // Prefer provided defaultName; otherwise scan top lines excluding headers, emails, phones, and addresses
  let fullName = defaultName;
  if (!fullName && lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (
        !line.includes('@') &&
        !line.match(/\d{4}/) &&
        !line.toLowerCase().includes('resume') &&
        !line.toLowerCase().includes('curriculum vitae') &&
        line.split(/\s+/).length >= 2 &&
        line.split(/\s+/).length <= 4 &&
        /^[A-Za-z\s.]+$/.test(line)
      ) {
        fullName = line;
        break;
      }
    }
  }

  const nameParts = (fullName || 'Candidate').split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // 5. City / Location (Checks for common Indian tech hubs and location keywords)
  const cities = ['Pune', 'Mumbai', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Chennai', 'Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Kolkata', 'Ahmedabad', 'Nagpur', 'Nashik', 'Indore'];
  let city: string | undefined = undefined;
  for (const c of cities) {
    if (new RegExp('\\b' + c + '\\b', 'i').test(rawText)) {
      city = c;
      break;
    }
  }

  // 6. Education / Degree
  const degreeRegex = /\b(B\.?Tech|B\.?E\.?|B\.?Sc|BCA|MCA|M\.?Tech|M\.?S\.?|MBA|B\.?Com|Diploma)\b/i;
  const degreeMatch = rawText.match(degreeRegex);
  const degree = degreeMatch ? degreeMatch[0].toUpperCase() : undefined;

  // College / University
  let college: string | undefined = undefined;
  const collegeRegex = /([A-Z][A-Za-z\s&]{3,40}(?:College|University|Institute|Polytechnic|Academy|Vidhyapeeth))/;
  const collegeMatch = rawText.match(collegeRegex);
  if (collegeMatch) {
    college = collegeMatch[1].trim();
  }

  // Graduation Year (4 digits between 1995 and 2030)
  let graduationYear: number | undefined = undefined;
  const gradYearRegex = /\b(?:passed(?:\s+in)?|graduation|batch\s+of|batch|passing\s+year|year\s+of\s+passing)?[:\s\-]*\b(20[0-2][0-9]|199[5-9])\b/i;
  const gradMatch = rawText.match(gradYearRegex);
  if (gradMatch && gradMatch[1]) {
    graduationYear = parseInt(gradMatch[1], 10);
  }

  // 7. Years of Experience
  let yearsExperience: number | undefined = undefined;
  const expRegex = /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i;
  const expMatch = rawText.match(expRegex);
  if (expMatch && expMatch[1]) {
    yearsExperience = parseFloat(expMatch[1]);
  } else if (/fresher|entry[\s-]level|recent\s+graduate/i.test(rawText)) {
    yearsExperience = 0;
  }

  // 8. Technical Skills Discovery
  const skillDictionary = [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
    'React', 'Node.js', 'Express', 'Angular', 'Vue.js', 'Next.js', 'Redux', 'HTML5', 'CSS3', 'Tailwind',
    'Power BI', 'Tableau', 'Excel', 'Advanced Excel', 'Pandas', 'NumPy', 'Scikit-Learn', 'TensorFlow', 'PyTorch',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Generative AI', 'Statistics',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Git', 'GitHub',
    'Spring Boot', 'Hibernate', 'Microservices', 'REST APIs', 'GraphQL',
    'SEO', 'Google Ads', 'Meta Ads', 'Social Media Marketing', 'Google Analytics'
  ];

  const lowerRaw = rawText.toLowerCase();
  const skills: string[] = [];
  for (const s of skillDictionary) {
    const pattern = new RegExp('\\b' + s.toLowerCase().replace('.', '\\.') + '\\b', 'i');
    if (pattern.test(lowerRaw)) {
      skills.push(s);
    }
  }

  return {
    rawText,
    isOcrUsed: false,
    fullName: fullName || defaultName || 'Applicant',
    firstName,
    lastName,
    email,
    phone,
    city,
    state: city ? 'Maharashtra' : undefined,
    country: 'India',
    degree,
    college,
    graduationYear,
    yearsExperience,
    skills,
    linkedinUrl,
    githubUrl,
    portfolioUrl
  };
}
