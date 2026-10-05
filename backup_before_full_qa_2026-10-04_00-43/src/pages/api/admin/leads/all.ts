// ============================================================
// /api/admin/leads/all
// Secure Admin Bulk Deletion Endpoint for Leads & Inquiries
// Strict RBAC: 401 Unauthenticated, 403 Non-Admin
// Requires Exact Confirmation Phrase: "DELETE ALL LEADS"
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { getAdminSession } from '../../../../lib/auth';

export const prerender = false;

// GET: Returns real-time impact summary before deletion
export const GET: APIRoute = async ({ request }) => {
  const session = getAdminSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthenticated: Valid session required.' }), {
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
    const impact = await db.getLeadsImpactSummary();
    return new Response(JSON.stringify(impact), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API] Leads impact summary error:', err);
    return new Response(JSON.stringify({ error: 'Failed to retrieve impact summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Permanently purges all leads
export const DELETE: APIRoute = async ({ request }) => {
  const session = getAdminSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthenticated: Valid session required.' }), {
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
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    if (body.confirmation !== 'DELETE ALL LEADS') {
      return new Response(JSON.stringify({ 
        error: 'Invalid confirmation phrase. You must provide exact phrase: DELETE ALL LEADS' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.deleteAllLeads(session.email);

    return new Response(JSON.stringify({
      success: true,
      message: 'All leads and inquiries have been deleted successfully.',
      details: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API] Bulk delete leads failed:', err);
    return new Response(JSON.stringify({ 
      error: err.message || 'Bulk deletion failed. Database rolled back safely.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
