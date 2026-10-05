// ============================================================
// /api/admin/jobs
// CRUD for Jobs
// ============================================================

import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { Job } from '../../../lib/types';

export const GET: APIRoute = async () => {
  const jobs = await db.getJobs(false);
  return new Response(JSON.stringify(jobs), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, title, jobRoleId, company, location, type = 'Full-time', experience, description, skillsRequired = [], deadline, isActive = true } = body;

  if (!title || !company || !location) {
    return new Response(JSON.stringify({ error: 'Title, company, and location are required.' }), { status: 400 });
  }

  const job: Job = {
    id: id || crypto.randomUUID(),
    title: title.trim(),
    job_role_id: jobRoleId || undefined,
    company: company.trim(),
    location: location.trim(),
    type,
    experience: experience || 'Fresher',
    description: description || '',
    skills_required: Array.isArray(skillsRequired) ? skillsRequired : String(skillsRequired).split(',').map(s => s.trim()).filter(Boolean),
    deadline: deadline || undefined,
    is_active: Boolean(isActive),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const saved = await db.saveJob(job);
  return new Response(JSON.stringify({ success: true, job: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, isActive } = body;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const jobs = await db.getJobs(false);
  const job = jobs.find(j => j.id === id);
  if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });

  if (isActive !== undefined) job.is_active = Boolean(isActive);
  const saved = await db.saveJob(job);
  return new Response(JSON.stringify({ success: true, job: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteJob(id);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
