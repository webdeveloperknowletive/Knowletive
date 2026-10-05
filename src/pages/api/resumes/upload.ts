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
import { getSafeCorsHeaders } from '../../../lib/auth';
import type { Candidate, ResumeKeywordMatch } from '../../../lib/types';
import { isValidEmail } from '../../../lib/validators';

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
    const inputEmail = ((formData.get('email') as string) || '').trim().toLowerCase();
    const inputPhone = (formData.get('phone') as string) || '';

    if (inputEmail && !isValidEmail(inputEmail)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please enter a valid email address.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Strict 10-digit mobile number validation
    let cleanPhone = inputPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    }

    if (!cleanPhone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phone number is required.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (cleanPhone.length !== 10) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mobile number must contain exactly 10 digits.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please enter a valid 10-digit Indian mobile number.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const preferredRole = (formData.get('preferred_role') as string) || (formData.get('preferredRole') as string) || '';
    const appliedRoleId = (formData.get('applied_role_id') as string) || (formData.get('appliedRoleId') as string) || undefined;
    const experienceLevel = (formData.get('experience_level') as string) || (formData.get('experienceLevel') as string) || undefined;
    const linkedinUrl = (formData.get('linkedin_url') as string) || (formData.get('linkedinUrl') as string) || undefined;
    const privacyConsent = formData.get('consent') === 'on' || formData.get('consent') === 'true' || formData.get('privacyConsent') === 'true' || formData.get('privacyConsent') === 'on';

    const rawAppType = ((formData.get('application_type') as string) || (formData.get('applicationType') as string) || '').toLowerCase().trim();
    const jobId = ((formData.get('job_id') as string) || (formData.get('jobId') as string) || '').trim();
    const internshipId = ((formData.get('internship_id') as string) || (formData.get('internshipId') as string) || '').trim();
    let appliedRole = ((formData.get('applied_role') as string) || (formData.get('appliedRole') as string) || '').trim();

    // Determine and validate application_type
    let applicationType: 'job' | 'internship' = 'job';
    if (rawAppType === 'internship' || rawAppType === 'intern') {
      applicationType = 'internship';
    } else if (rawAppType === 'job') {
      applicationType = 'job';
    } else if (internshipId) {
      applicationType = 'internship';
    } else if (jobId) {
      applicationType = 'job';
    }

    // Strict validation rules:
    // If internship: internship_id required, job_id must be null
    // If job: job_id required, internship_id must be null
    if (applicationType === 'internship') {
      if (!internshipId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Validation Error: internship_id is required for internship applications.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (jobId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Validation Error: Malformed application. An internship application cannot specify a job_id.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (applicationType === 'job') {
      // If job was explicitly targeted or has a jobId
      if (rawAppType === 'job' && !jobId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Validation Error: job_id is required for job applications.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (internshipId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Validation Error: Malformed application. A job application cannot specify an internship_id.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    let targetRoleId = appliedRoleId;

    if (applicationType === 'internship' && internshipId) {
      const allInternships = await db.getInternships(false);
      const foundIntern = allInternships.find(i => i.id === internshipId);
      if (!foundIntern) {
        return new Response(JSON.stringify({
          success: false,
          error: `Internship with ID ${internshipId} not found.`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (foundIntern.job_role_id) targetRoleId = foundIntern.job_role_id;
      if (!appliedRole) appliedRole = foundIntern.title;
    } else if (applicationType === 'job' && jobId) {
      const allJobs = await db.getJobs(false);
      const foundJob = allJobs.find(j => j.id === jobId);
      if (!foundJob) {
        return new Response(JSON.stringify({
          success: false,
          error: `Job with ID ${jobId} not found.`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (foundJob.job_role_id) targetRoleId = foundJob.job_role_id;
      if (!appliedRole) appliedRole = foundJob.title;
    }

    if (!appliedRole) {
      appliedRole = preferredRole || 'General Candidate Pool';
    }

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
      targetRoleId || appliedRoleId
    );

    // 7. Assemble Candidate record & Deduplicate profile
    const candEmail = details.email || inputEmail || 'unspecified@candidate.local';
    const candPhone = cleanPhone || details.phone || 'N/A';
    const existingCandidate = await db.findCandidateByEmailOrPhone(candEmail, candPhone);
    const candidateId = existingCandidate ? existingCandidate.id : crypto.randomUUID();
    const now = new Date().toISOString();

    const candidate: Candidate = {
      id: candidateId,
      full_name: details.fullName || inputName || existingCandidate?.full_name || 'Applicant',
      first_name: details.firstName || existingCandidate?.first_name || '',
      last_name: details.lastName || existingCandidate?.last_name || '',
      email: candEmail,
      phone: candPhone,
      city: details.city || (formData.get('city') as string) || existingCandidate?.city || undefined,
      state: details.state || existingCandidate?.state || undefined,
      country: details.country || existingCandidate?.country || 'India',
      education: details.degree || (formData.get('education') as string) || existingCandidate?.education || undefined,
      degree: details.degree || existingCandidate?.degree || undefined,
      college: details.college || existingCandidate?.college || undefined,
      graduation_year: details.graduationYear || existingCandidate?.graduation_year || undefined,
      experience_level: experienceLevel || existingCandidate?.experience_level || undefined,
      years_experience: details.yearsExperience !== undefined ? details.yearsExperience : existingCandidate?.years_experience,
      preferred_role: preferredRole || appliedRole || existingCandidate?.preferred_role || undefined,
      applied_role: appliedRole,
      applied_role_id: targetRoleId || appliedRoleId || existingCandidate?.applied_role_id,
      assigned_role_id: matchAnalysis.topRole?.id || existingCandidate?.assigned_role_id,
      application_type: applicationType,
      job_id: applicationType === 'job' && jobId ? jobId : undefined,
      internship_id: applicationType === 'internship' && internshipId ? internshipId : undefined,
      skills: details.skills && details.skills.length ? details.skills : (existingCandidate?.skills || []),
      resume_keywords: matchAnalysis.topRole 
        ? matchAnalysis.results.find(r => r.role.id === matchAnalysis.topRole?.id)?.matchedKeywords || []
        : (existingCandidate?.resume_keywords || []),
      linkedin_url: details.linkedinUrl || linkedinUrl || existingCandidate?.linkedin_url || undefined,
      github_url: details.githubUrl || existingCandidate?.github_url || undefined,
      portfolio_url: details.portfolioUrl || existingCandidate?.portfolio_url || undefined,
      resume_file_url: uploadResult.downloadUrl,
      resume_file_name: uploadResult.originalFileName,
      resume_file_type: uploadResult.mimeType,
      resume_file_size: uploadResult.fileSize,
      extracted_text: extractedText,
      match_score: matchAnalysis.topScore,
      status: matchAnalysis.assignedRoleStatus === 'Assigned' ? 'New' : 'Needs Review',
      source: (formData.get('source') as string) || (applicationType === 'internship' ? 'Internship Portal' : 'Job Portal'),
      privacy_consent: privacyConsent,
      is_read: false,
      viewed_at: null,
      created_at: existingCandidate?.created_at || now,
      updated_at: now
    };

    // 8. Save candidate profile to database
    await db.saveCandidate(candidate);

    // 9. Save dedicated Application record
    const applicationId = crypto.randomUUID();
    const application = {
      id: applicationId,
      candidate_id: candidate.id,
      application_type: applicationType,
      job_id: applicationType === 'job' && jobId ? jobId : null,
      internship_id: applicationType === 'internship' && internshipId ? internshipId : null,
      applied_role: appliedRole,
      status: 'New' as const,
      resume_url: uploadResult.downloadUrl,
      resume_file_name: uploadResult.originalFileName,
      resume_file_size: uploadResult.fileSize,
      match_score: matchAnalysis.topScore,
      matched_keywords: candidate.resume_keywords,
      skills: candidate.skills,
      source: candidate.source,
      created_at: now,
      updated_at: now
    };

    await db.saveApplication(application);

    const keywordMatchesToSave: ResumeKeywordMatch[] = matchAnalysis.keywordMatchesToPersist.map(m => ({
      id: crypto.randomUUID(),
      candidate_id: candidate.id,
      job_role_id: m.job_role_id,
      keyword: m.keyword,
      matched: m.matched,
      weight: m.weight,
      created_at: now
    }));

    await db.saveCandidateMatches(keywordMatchesToSave);

    const corsHeaders = getSafeCorsHeaders(request, 'POST, OPTIONS');

    return new Response(JSON.stringify({
      success: true,
      message: 'Application submitted successfully',
      candidateId: candidate.id,
      applicationId: application.id,
      applicationType: application.application_type,
      appliedRole: application.applied_role,
      matchedRole: matchAnalysis.topRole?.role_name || 'Needs Review',
      matchScore: matchAnalysis.topScore,
      assignedStatus: application.status,
      isOcrUsed: isOcr
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
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

    const corsHeaders = getSafeCorsHeaders(request, 'POST, OPTIONS');
    return new Response(JSON.stringify({
      success: false,
      error: msg,
      message: msg
    }), {
      status: isValidationErr ? 400 : 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
};

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: getSafeCorsHeaders(request, 'POST, OPTIONS')
  });
};
