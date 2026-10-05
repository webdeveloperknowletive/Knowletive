// ============================================================
// GET /api/admin/dashboard/stats
// Admin RBAC Protected Live Operational Statistics
// Pure Server-Side Calculation from Real Database Records
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { getAdminSession } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  // 1. RBAC Authentication Check
  const session = getAdminSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthenticated: Valid admin session required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin role required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 2. Fetch fresh live data from database
    const stats = await db.getDashboardStats();

    // 3. Return structured schema
    const responsePayload = {
      totalResumes: stats.totalResumes,
      resumesToday: stats.newResumesToday,
      resumesThisWeek: stats.applicationsThisWeek,

      totalLeads: stats.totalLeads,

      leadTypes: {
        course: stats.courseInquiries,
        counseling: stats.counselingLeads,
        admission: stats.admissionLeads,
        ebook: stats.ebookLeads,
        jobApplications: stats.jobApplications,
        internshipApplications: stats.internshipApplications,
        jobInternship: stats.jobApplications + stats.internshipApplications,
        overseas: stats.overseasLeads,
        contact: stats.contactLeads,
        other: stats.otherLeads
      },

      candidateStatus: {
        applied: stats.applied,
        needsReview: stats.needsReview,
        shortlisted: stats.shortlisted,
        selected: stats.selected,
        interview: stats.interview,
        rejected: stats.rejected
      },

      activeJobs: stats.activeJobs,
      activeInternships: stats.activeInternships,

      server: {
        status: 'online',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('[API Dashboard Stats Error]:', err);
    return new Response(JSON.stringify({
      error: 'Unable to load dashboard statistics.',
      details: err.message || 'Database connection error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
