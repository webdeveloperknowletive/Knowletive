// ============================================================
// Knowletive Server Middleware
// Enforces Server-Side Admin Protection & RBAC
// ============================================================

import { defineMiddleware } from 'astro:middleware';
import { isAdmin, getAdminSession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, redirect } = context;
  const pathname = url.pathname;

  // 1. Check Admin Routes
  if (pathname.startsWith('/admin')) {
    // Allow the login page
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      // If already logged in as admin, redirect directly into dashboard
      if (isAdmin(request)) {
        return redirect('/admin', 302);
      }
      const response = await next();
      return addSecurityHeaders(response);
    }

    // Strict Rule: Unauthenticated OR non-admin user trying to access /admin or /admin/*
    // MUST be redirected to the HOME PAGE (/)
    // Never show an unauthorized page, login credentials, or partial dashboard UI
    if (!isAdmin(request)) {
      return redirect('/', 302);
    }
  }

  // 2. Protect Admin API Routes & Protected Resume Downloads
  if (
    pathname.startsWith('/api/admin') || 
    pathname.startsWith('/api/exports') || 
    pathname.startsWith('/api/resumes/download')
  ) {
    const session = getAdminSession(request);
    if (!session) {
      if (pathname.startsWith('/api/resumes/download')) {
        return redirect('/', 302);
      }
      if (pathname.startsWith('/api/exports')) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Unauthenticated: Valid session required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (session.role !== 'admin') {
      if (pathname.startsWith('/api/resumes/download')) {
        return redirect('/', 302);
      }
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin role required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const response = await next();
  return addSecurityHeaders(response);
});

function addSecurityHeaders(response: Response): Response {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
