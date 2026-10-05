// ============================================================
// /api/admin/internships/[id]/applications
// GET applications for a specific internship
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

  const internshipId = params.id;
  if (!internshipId) {
    return new Response(JSON.stringify({ success: false, error: 'Internship ID missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const applications = await db.getApplications({
      type: 'internship',
      internshipId
    });

    return new Response(JSON.stringify({
      success: true,
      internshipId,
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
