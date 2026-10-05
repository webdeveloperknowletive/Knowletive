// ============================================================
// PATCH / POST /api/admin/leads/[id]/read
// Marks a specific lead record as read in the database
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { getAdminSession, getSafeCorsHeaders } from '../../../../../lib/auth';

const handler: APIRoute = async ({ params, request }) => {
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

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lead ID.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const updated = await db.markLeadAsRead(id);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Lead not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const corsHeaders = getSafeCorsHeaders(request, 'PATCH, POST, OPTIONS');
    return new Response(JSON.stringify({
      success: true,
      leadId: updated.id,
      is_read: updated.is_read,
      viewed_at: updated.viewed_at
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    console.error('[API Lead Read Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to mark lead as read.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = handler;
export const POST: APIRoute = handler;
