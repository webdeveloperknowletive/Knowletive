// ============================================================
// /api/admin/candidates/[id]
// GET, PATCH, DELETE Candidate
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const candidate = await db.getCandidateById(id);
  if (!candidate) return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404 });

  const matches = await db.getCandidateMatches(id);
  return new Response(JSON.stringify({ candidate, matches }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const candidate = await db.getCandidateById(id);
  if (!candidate) return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404 });

  const body = await request.json();
  if (body.status) candidate.status = body.status;
  if (body.assignedRoleId !== undefined) candidate.assigned_role_id = body.assignedRoleId || undefined;
  if (body.adminNotes !== undefined) candidate.admin_notes = body.adminNotes;

  const updated = await db.saveCandidate(candidate);
  return new Response(JSON.stringify({ success: true, candidate: updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteCandidate(id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
