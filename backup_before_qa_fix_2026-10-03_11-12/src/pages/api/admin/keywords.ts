// ============================================================
// /api/admin/keywords
// GET, POST, DELETE Role Keywords
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { RoleKeyword } from '../../../lib/types';

export const GET: APIRoute = async ({ url }) => {
  const roleId = url.searchParams.get('roleId');
  if (roleId) {
    const keywords = await db.getKeywordsByRole(roleId, false);
    return new Response(JSON.stringify(keywords), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const all = await db.getAllKeywords(false);
  return new Response(JSON.stringify(all), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, jobRoleId, keyword, weight = 3, isActive = true } = body;

  if (!jobRoleId || !keyword) {
    return new Response(JSON.stringify({ error: 'Job role and keyword are required.' }), { status: 400 });
  }

  const kw: RoleKeyword = {
    id: id || crypto.randomUUID(),
    job_role_id: jobRoleId,
    keyword: keyword.trim().toLowerCase(),
    weight: Math.max(1, Math.min(10, Number(weight) || 3)),
    is_active: Boolean(isActive),
    created_at: new Date().toISOString()
  };

  const saved = await db.saveRoleKeyword(kw);
  return new Response(JSON.stringify({ success: true, keyword: saved }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteRoleKeyword(id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
