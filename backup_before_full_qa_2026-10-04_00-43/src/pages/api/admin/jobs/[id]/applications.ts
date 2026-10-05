// ============================================================
// /api/admin/jobs/[id]/applications
// GET applications for a specific job
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { isAdmin } from '../../../../../lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const jobId = params.id;
  if (!jobId) {
    return new Response(JSON.stringify({ success: false, error: 'Job ID missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const applications = await db.getApplications({
      type: 'job',
      jobId
    });

    return new Response(JSON.stringify({
      success: true,
      jobId,
      count: applications.length,
      applications
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
