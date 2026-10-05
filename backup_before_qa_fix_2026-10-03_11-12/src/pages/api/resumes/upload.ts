// ============================================================
// POST /api/resumes/upload
// Complete Resume Processing Pipeline:
// File Validation -> Secure Storage -> Text Extraction ->
// OCR Fallback -> Detail Extraction -> Keyword Matching -> Database
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import { storage } from '../../../lib/storage';
import { extractResumeText, extractCandidateDetails } from '../../../lib/resumeParser';
import { evaluateAllRoles } from '../../../lib/matcher';
import type { Candidate, ResumeKeywordMatch } from '../../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File | null;

    if (!resumeFile || !(resumeFile instanceof File) || resumeFile.size === 0) {
      return new Response(JSON.stringify({ error: 'Please select a valid resume file (PDF, DOCX, or TXT under 20 MB).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const inputName = (formData.get('full_name') as string) || (formData.get('fullName') as string) || '';
    const inputEmail = (formData.get('email') as string) || '';
    const inputPhone = (formData.get('phone') as string) || '';
    const preferredRole = (formData.get('preferred_role') as string) || (formData.get('preferredRole') as string) || '';
    const appliedRoleId = (formData.get('applied_role_id') as string) || (formData.get('appliedRoleId') as string) || undefined;
    const experienceLevel = (formData.get('experience_level') as string) || (formData.get('experienceLevel') as string) || undefined;
    const linkedinUrl = (formData.get('linkedin_url') as string) || (formData.get('linkedinUrl') as string) || undefined;
    const privacyConsent = formData.get('consent') === 'on' || formData.get('consent') === 'true' || formData.get('privacyConsent') === 'true' || formData.get('privacyConsent') === 'on';

    // 1. Save Resume File into Secure Storage (validates MIME, extension, size <= 20MB, magic bytes)
    const uploadResult = await storage.saveResume(resumeFile);

    // 2. Read buffer for text extraction
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract text (PDF/DOCX/TXT) with automated OCR fallback if scanned PDF
    const { text: extractedText, isOcr } = await extractResumeText(
      buffer,
      uploadResult.mimeType,
      uploadResult.originalFileName
    );

    // 4. Extract structured details (Name, contact, links, education, experience, skills)
    const details = extractCandidateDetails(extractedText, inputName, inputEmail, inputPhone);

    // 5. Query active roles and keywords for weighted matching
    const [roles, allKeywords] = await Promise.all([
      db.getJobRoles(true),
      db.getAllKeywords(true)
    ]);

    // 6. Run weighted keyword matching across all active job roles
    const matchAnalysis = evaluateAllRoles(
      extractedText,
      roles,
      allKeywords,
      appliedRoleId
    );

    // 7. Assemble Candidate record
    const candidateId = crypto.randomUUID();
    const now = new Date().toISOString();

    const candidate: Candidate = {
      id: candidateId,
      full_name: details.fullName || inputName || 'Applicant',
      first_name: details.firstName || '',
      last_name: details.lastName || '',
      email: details.email || inputEmail || 'unspecified@candidate.local',
      phone: details.phone || inputPhone || 'N/A',
      city: details.city || (formData.get('city') as string) || undefined,
      state: details.state || undefined,
      country: details.country || 'India',
      education: details.degree || (formData.get('education') as string) || undefined,
      degree: details.degree || undefined,
      college: details.college || undefined,
      graduation_year: details.graduationYear || undefined,
      experience_level: experienceLevel || undefined,
      years_experience: details.yearsExperience !== undefined ? details.yearsExperience : undefined,
      preferred_role: preferredRole || (matchAnalysis.topRole?.role_name) || undefined,
      applied_role_id: appliedRoleId || undefined,
      assigned_role_id: matchAnalysis.topRole?.id || undefined,
      skills: details.skills,
      resume_keywords: matchAnalysis.topRole 
        ? matchAnalysis.results.find(r => r.role.id === matchAnalysis.topRole?.id)?.matchedKeywords || []
        : [],
      linkedin_url: details.linkedinUrl || linkedinUrl || undefined,
      github_url: details.githubUrl || undefined,
      portfolio_url: details.portfolioUrl || undefined,
      resume_file_url: uploadResult.downloadUrl,
      resume_file_name: uploadResult.originalFileName,
      resume_file_type: uploadResult.mimeType,
      resume_file_size: uploadResult.fileSize,
      extracted_text: extractedText,
      match_score: matchAnalysis.topScore,
      status: matchAnalysis.assignedRoleStatus === 'Assigned' ? 'New' : 'Needs Review',
      source: (formData.get('source') as string) || 'Website Careers',
      privacy_consent: privacyConsent,
      created_at: now,
      updated_at: now
    };

    // 8. Save candidate and keyword matches to database
    await db.saveCandidate(candidate);

    const keywordMatchesToSave: ResumeKeywordMatch[] = matchAnalysis.keywordMatchesToPersist.map(m => ({
      id: crypto.randomUUID(),
      candidate_id: candidateId,
      job_role_id: m.job_role_id,
      keyword: m.keyword,
      matched: m.matched,
      weight: m.weight,
      created_at: now
    }));

    await db.saveCandidateMatches(keywordMatchesToSave);

    // 9. Also record a corresponding Lead record so it appears on leads dashboard
    const lead: any = {
      id: crypto.randomUUID(),
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      lead_type: 'Job',
      education: candidate.education,
      college: candidate.college,
      preferred_role: candidate.preferred_role,
      message: `Resume submitted for ${candidate.preferred_role || 'Job/Internship'}. Match Score: ${candidate.match_score}%. Top Role: ${matchAnalysis.topRole?.role_name || 'Needs Review'}.`,
      source: 'Resume Portal',
      status: 'New',
      privacy_consent: privacyConsent,
      created_at: now,
      updated_at: now
    };
    await db.saveLead(lead);

    return new Response(JSON.stringify({
      success: true,
      candidateId: candidate.id,
      matchedRole: matchAnalysis.topRole?.role_name || 'Needs Review',
      matchScore: matchAnalysis.topScore,
      assignedStatus: candidate.status,
      isOcrUsed: isOcr
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Resume Upload Error]:', err);
    const msg = err.message || 'Failed to process resume submission.';
    const isValidationErr = 
      msg.includes('limit') || 
      msg.includes('exceeds') || 
      msg.includes('Invalid') || 
      msg.includes('signature') || 
      msg.includes('format') || 
      msg.includes('empty');

    return new Response(JSON.stringify({ error: msg }), {
      status: isValidationErr ? 400 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
