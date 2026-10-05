// ============================================================
// POST /api/auth/login
// Authenticates Admin and sets secure session cookie
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { verifyPassword, createSessionToken, createSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const profile = await db.getProfileByEmail(email);
    if (!profile || !profile.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid email or password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValid = verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid email or password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Role check: Only admin allowed
    if (profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Access denied: Administrator privileges required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = createSessionToken(profile);
    const cookieHeader = createSessionCookie(token);

    return new Response(JSON.stringify({ success: true, redirect: '/admin' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });
  } catch (err: any) {
    console.error('[API Auth Login Error]:', err);
    return new Response(JSON.stringify({ error: 'An unexpected authentication error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
