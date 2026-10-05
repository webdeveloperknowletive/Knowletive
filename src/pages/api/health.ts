// ============================================================
// GET /api/health
// System Health & Database Connectivity Check
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const stats = await db.getDashboardStats();
    return new Response(JSON.stringify({
      status: 'ok',
      server: 'online',
      database: 'connected',
      metrics: {
        totalResumes: stats.totalResumes,
        totalLeads: stats.totalLeads
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('[Health Check Failed]:', err);
    return new Response(JSON.stringify({
      status: 'error',
      server: 'online',
      database: 'disconnected',
      error: err.message || 'Database query failed',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};
