// ============================================================
// POST /api/auth/logout
// Clears session cookie and logs out admin
// ============================================================

import type { APIRoute } from 'astro';
import { createLogoutCookie } from '../../../lib/auth';

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true, redirect: '/' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createLogoutCookie()
    }
  });
};
