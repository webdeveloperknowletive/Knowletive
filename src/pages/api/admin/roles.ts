// ============================================================
// /api/admin/roles
// GET, POST, DELETE Job Roles
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { JobRole } from '../../../lib/types';

export const GET: APIRoute = async () => {
  const roles = await db.getJobRoles(false);
  return new Response(JSON.stringify(roles), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, roleName, category = 'Technology', description = '', matchThreshold = 40, isActive = true } = body;

  if (!roleName) {
    return new Response(JSON.stringify({ error: 'Role name is required.' }), { status: 400 });
  }

  const slug = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const roleId = id || crypto.randomUUID();

  const role: JobRole = {
    id: roleId,
    role_name: roleName.trim(),
    slug,
    category,
    description,
    match_threshold: Number(matchThreshold) || 40,
    is_active: Boolean(isActive),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const saved = await db.saveJobRole(role);
  return new Response(JSON.stringify({ success: true, role: saved }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteJobRole(id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
