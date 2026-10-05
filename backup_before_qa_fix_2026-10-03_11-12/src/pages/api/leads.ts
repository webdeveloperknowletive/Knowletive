// ============================================================
// POST /api/leads
// Public Lead Submission Endpoint for Contact, Inquiry & eBook Forms
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../lib/db';
import type { Lead, LeadType } from '../../lib/types';

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

    let firstName = data.firstName || data.first_name || '';
    let lastName = data.lastName || data.last_name || '';

    // Handle full_name input (e.g. from eBook CTA form)
    if (!firstName && (data.fullName || data.full_name)) {
      const parts = String(data.fullName || data.full_name).trim().split(' ');
      firstName = parts[0] || 'Applicant';
      lastName = parts.slice(1).join(' ') || '';
    }

    const email = data.email || '';
    const phone = data.phone || '';
    const leadType = data.leadType || data.lead_type || 'Contact';
    const courseInterest = data.courseInterest || data.course_interest || data.program_interest || data.program;
    const serviceInterest = data.serviceInterest || data.service_interest;
    const admissionInterest = data.admissionInterest || data.admission_interest;
    const counselingInterest = data.counselingInterest || data.counseling_interest;
    const education = data.education;
    const degree = data.degree;
    const college = data.college;
    const graduationYear = data.graduationYear || data.graduation_year;
    const coursesCompleted = data.coursesCompleted || data.courses_completed;
    const currentStatus = data.currentStatus || data.current_status;
    const opportunityType = data.opportunityType || data.opportunity_type;
    const careerGoal = data.careerGoal || data.career_goal;
    const preferredRole = data.preferredRole || data.preferred_role;
    const preferredLocation = data.preferredLocation || data.preferred_location;
    const linkedinUrl = data.linkedinUrl || data.linkedin_url;
    const message = data.message;
    const source = data.source || 'Website Form';
    const privacyConsent = data.privacyConsent !== undefined ? data.privacyConsent : (data.consent !== undefined ? data.consent : true);

    // Validation
    if (!firstName || !email || !phone) {
      return new Response(JSON.stringify({ error: 'First name, email, and phone number are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return new Response(JSON.stringify({ error: 'Please provide a valid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      return new Response(JSON.stringify({ error: 'Please provide a valid phone number.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const lead: Lead = {
      id: crypto.randomUUID(),
      first_name: String(firstName).trim(),
      last_name: String(lastName || '').trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      lead_type: leadType as LeadType,
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
