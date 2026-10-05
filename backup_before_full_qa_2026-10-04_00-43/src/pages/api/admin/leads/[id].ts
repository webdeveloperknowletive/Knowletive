// ============================================================
// /api/admin/leads/[id]
// PATCH, DELETE Lead
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const lead = await db.getLeadById(id);
  if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  const body = await request.json();
  if (body.status) lead.status = body.status;
  if (body.adminNotes !== undefined) lead.admin_notes = body.adminNotes;

  const updated = await db.saveLead(lead);
  return new Response(JSON.stringify({ success: true, lead: updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteLead(id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
