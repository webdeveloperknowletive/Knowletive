// ============================================================
// /api/admin/applications
// Admin Applications Management (Job & Internship separation)
// Strict RBAC Authentication
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';
import type { ApplicationStatus } from '../../../lib/types';

export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin authentication required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const typeParam = url.searchParams.get('type') as 'job' | 'internship' | null;
    const jobId = url.searchParams.get('jobId') || undefined;
    const internshipId = url.searchParams.get('internshipId') || undefined;
    const candidateId = url.searchParams.get('candidateId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const applications = await db.getApplications({
      type: typeParam || undefined,
      jobId,
      internshipId,
      candidateId,
      status,
      search
    });

    return new Response(JSON.stringify({
      success: true,
      count: applications.length,
      applications
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Admin Applications GET Error]:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to fetch applications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin authentication required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const id = body.id;
    const status = body.status as ApplicationStatus;
    const notes = body.notes;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Application ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validStatuses: ApplicationStatus[] = ['New', 'Needs Review', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected'];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ success: false, error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updated = await db.updateApplicationStatus(id, status, notes);
    if (!updated) {
      return new Response(JSON.stringify({ success: false, error: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Application status updated to ${status}`,
      application: updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Admin Applications PATCH Error]:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to update application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin authentication required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Application ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deleted = await db.deleteApplication(id);
    return new Response(JSON.stringify({ success: deleted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Admin Applications DELETE Error]:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to delete application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
