// ============================================================
// /api/admin/candidates/all
// Secure Admin Bulk Deletion Endpoint for Candidates & Resumes
// Strict RBAC: 401 Unauthenticated, 403 Non-Admin
// Requires Exact Confirmation Phrase: "DELETE ALL CANDIDATES"
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { isAdmin, getAdminSession } from '../../../../lib/auth';

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
    const impact = await db.getCandidatesImpactSummary();
    return new Response(JSON.stringify(impact), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API] Candidates impact summary error:', err);
    return new Response(JSON.stringify({ error: 'Failed to retrieve impact summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Permanently purges all candidates, keyword matches, and resume files
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

    if (body.confirmation !== 'DELETE ALL CANDIDATES') {
      return new Response(JSON.stringify({ 
        error: 'Invalid confirmation phrase. You must provide exact phrase: DELETE ALL CANDIDATES' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.deleteAllCandidates(session.email);

    return new Response(JSON.stringify({
      success: true,
      message: 'All candidates have been deleted successfully.',
      details: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API] Bulk delete candidates failed:', err);
    return new Response(JSON.stringify({ 
      error: err.message || 'Bulk deletion failed. Database rolled back safely.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
