// ============================================================
// GET /api/admin/notifications/counts
// Real-time unread notification counts for Admin Sidebar
// Returns { candidates: number, leads: number } from real DB queries
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { getAdminSession, getSafeCorsHeaders } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const session = getAdminSession(request);

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient administrative privileges.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const counts = await db.getUnreadCounts();
    const corsHeaders = getSafeCorsHeaders(request, 'GET, OPTIONS');

    return new Response(JSON.stringify({
      candidates: counts.candidates,
      leads: counts.leads
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('[API Notifications Counts Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to retrieve notification counts.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
