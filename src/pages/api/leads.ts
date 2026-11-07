// ============================================================
// POST /api/leads
// Public Lead Submission Endpoint for Contact, Inquiry & eBook Forms
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../lib/db';
import type { Lead, LeadType } from '../../lib/types';
import { isValidEmail } from '../../lib/validators';

export const POST: APIRoute = async ({ request }) => {
  try {
    let data: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    }

    // Anti-spam honeypot detection
    if (data._hp || data.website_hp || data.bot_field) {
      return new Response(JSON.stringify({ success: true, leadId: 'ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let firstName = data.firstName || data.first_name || '';
    let lastName = data.lastName || data.last_name || '';

    // Handle full_name input (e.g. from eBook CTA form)
    if (!firstName && (data.fullName || data.full_name || data.name)) {
      const parts = String(data.fullName || data.full_name || data.name).trim().split(' ');
      firstName = parts[0] || 'Applicant';
      lastName = parts.slice(1).join(' ') || '';
    }

    const email = data.email ? String(data.email).trim() : '';
    const phone = data.phone ? String(data.phone).trim() : '';
    let rawLeadType = data.leadType || data.lead_type || 'Contact';

    // Map lead_type to database check constraint values
    let leadType: LeadType = 'Contact';
    const ltLower = String(rawLeadType).toLowerCase();
    if (ltLower.includes('counsel') || ltLower.includes('career')) {
      leadType = 'Counseling';
    } else if (ltLower.includes('admission') || ltLower.includes('cet') || ltLower.includes('distance')) {
      leadType = 'Admission';
    } else if (ltLower.includes('internship') || ltLower.includes('training') || ltLower.includes('it-training')) {
      leadType = 'Internship';
    } else if (ltLower.includes('ebook')) {
      leadType = 'eBook';
    } else if (ltLower.includes('overseas')) {
      leadType = 'Overseas Education';
    } else if (ltLower.includes('course')) {
      leadType = 'Course';
    } else if (ltLower.includes('job')) {
      leadType = 'Job';
    } else if (ltLower.includes('data') || ltLower.includes('coachgenie') || ltLower.includes('other')) {
      leadType = 'Other';
    }

    const serviceInterest = data.serviceInterest || data.service_interest || data.service || rawLeadType;
    const courseInterest = data.courseInterest || data.course_interest || data.program_interest || data.program || data.targetCourse || data.target_course;
    const admissionInterest = data.admissionInterest || data.admission_interest;
    const counselingInterest = data.counselingInterest || data.counseling_interest;
    const education = data.education || data.qualification;
    const degree = data.degree || data.qualification;
    const college = data.college;
    const graduationYear = data.graduationYear || data.graduation_year;
    const coursesCompleted = data.coursesCompleted || data.courses_completed;
    const currentStatus = data.currentStatus || data.current_status || data.currentStage || data.current_stage;
    const opportunityType = data.opportunityType || data.opportunity_type;
    const careerGoal = data.careerGoal || data.career_goal;
    const preferredRole = data.preferredRole || data.preferred_role;
    const preferredLocation = data.preferredLocation || data.preferred_location;
    const linkedinUrl = data.linkedinUrl || data.linkedin_url;
    const message = data.message || data.question || data.requirement;
    const source = data.source || 'Website Form';
    const privacyConsent = data.privacyConsent !== undefined ? data.privacyConsent : (data.consent !== undefined ? data.consent : true);
    const marketingConsent = Boolean(data.marketingConsent || data.marketing_consent);

    // Landing page & UTM parameters (sanitized to 200 chars max)
    const landingPage = data.landingPage || data.landing_page || '';
    const utmSource = data.utmSource || data.utm_source ? String(data.utmSource || data.utm_source).slice(0, 100) : undefined;
    const utmMedium = data.utmMedium || data.utm_medium ? String(data.utmMedium || data.utm_medium).slice(0, 100) : undefined;
    const utmCampaign = data.utmCampaign || data.utm_campaign ? String(data.utmCampaign || data.utm_campaign).slice(0, 100) : undefined;
    const utmTerm = data.utmTerm || data.utm_term ? String(data.utmTerm || data.utm_term).slice(0, 100) : undefined;
    const utmContent = data.utmContent || data.utm_content ? String(data.utmContent || data.utm_content).slice(0, 100) : undefined;

    // Additional service-specific fields
    const companyName = data.companyName || data.company_name ? String(data.companyName || data.company_name).slice(0, 150) : undefined;
    const dataCategory = data.dataCategory || data.data_category ? String(data.dataCategory || data.data_category).slice(0, 100) : undefined;
    const targetCourse = data.targetCourse || data.target_course ? String(data.targetCourse || data.target_course).slice(0, 100) : undefined;
    const qualification = data.qualification ? String(data.qualification).slice(0, 150) : undefined;
    const ebookTitle = data.ebookTitle || data.ebook_title ? String(data.ebookTitle || data.ebook_title).slice(0, 150) : undefined;

    const isPopupLead = String(source).toLowerCase().includes('popup');
    const isNewsletter = String(source).toLowerCase().includes('newsletter') || (leadType === 'Other' && (!phone || phone === 'N/A'));
    const isLandingPage = Boolean(landingPage || String(source).toLowerCase().includes('landing'));

    // Validation: Require contact (either phone or email)
    if (!email && !phone && !isPopupLead) {
      return new Response(JSON.stringify({ error: 'Please provide either a mobile number or email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isLandingPage && !isPopupLead && !email) {
      return new Response(JSON.stringify({ error: 'Email address is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!firstName && !isNewsletter) {
      return new Response(JSON.stringify({ error: 'Full name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (email && !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let sanitizedPhone = '';
    if (!isNewsletter && phone && phone !== 'N/A') {
      let cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      if (cleanPhone.length !== 10) {
        return new Response(JSON.stringify({ error: 'Mobile number must contain exactly 10 digits.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
        return new Response(JSON.stringify({ error: 'Please enter a valid 10-digit Indian mobile number.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      sanitizedPhone = cleanPhone;
    } else if (!isNewsletter && !email) {
      return new Response(JSON.stringify({ error: 'Phone number is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const lead: Lead = {
      id: crypto.randomUUID(),
      first_name: String(firstName).trim(),
      last_name: String(lastName || '').trim(),
      email: email ? String(email).toLowerCase().trim() : '',
      phone: sanitizedPhone || String(phone || '').trim(),
      lead_type: leadType,
      course_interest: courseInterest,
      service_interest: serviceInterest,
      admission_interest: admissionInterest,
      counseling_interest: counselingInterest,
      education,
      degree,
      college,
      graduation_year: graduationYear ? parseInt(graduationYear, 10) : undefined,
      courses_completed: coursesCompleted,
      current_status: currentStatus,
      opportunity_type: opportunityType,
      career_goal: careerGoal,
      preferred_role: preferredRole,
      preferred_location: preferredLocation,
      linkedin_url: linkedinUrl,
      message,
      source,
      status: 'New',
      privacy_consent: Boolean(privacyConsent),
      marketing_consent: marketingConsent,
      landing_page: landingPage,
      company_name: companyName,
      data_category: dataCategory,
      target_course: targetCourse,
      qualification: qualification,
      ebook_title: ebookTitle,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      is_read: false,
      viewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await db.saveLead(lead);

    return new Response(JSON.stringify({ success: true, leadId: saved.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Leads Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to record inquiry. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
