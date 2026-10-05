// ============================================================
// /api/admin/internships
// CRUD for Internships
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { Internship } from '../../../lib/types';

export const GET: APIRoute = async () => {
  const internships = await db.getInternships(false);
  return new Response(JSON.stringify(internships), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, title, jobRoleId, department, location, duration, description, skillsRequired = [], isActive = true } = body;

  if (!title || !department || !location) {
    return new Response(JSON.stringify({ error: 'Title, department, and location are required.' }), { status: 400 });
  }

  const internship: Internship = {
    id: id || crypto.randomUUID(),
    title: title.trim(),
    job_role_id: jobRoleId || undefined,
    department: department.trim(),
    location: location.trim(),
    duration: duration || '3-6 Months',
    description: description || '',
    skills_required: Array.isArray(skillsRequired) ? skillsRequired : String(skillsRequired).split(',').map(s => s.trim()).filter(Boolean),
    is_active: Boolean(isActive),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const saved = await db.saveInternship(internship);
  return new Response(JSON.stringify({ success: true, internship: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, isActive } = body;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const internships = await db.getInternships(false);
  const internship = internships.find(i => i.id === id);
  if (!internship) return new Response(JSON.stringify({ error: 'Internship not found' }), { status: 404 });

  if (isActive !== undefined) internship.is_active = Boolean(isActive);
  const saved = await db.saveInternship(internship);
  return new Response(JSON.stringify({ success: true, internship: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteInternship(id);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
