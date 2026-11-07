// ============================================================
// GET /api/health
// System Health & Supabase Database / Storage Connectivity Check
// ============================================================

import type { APIRoute } from 'astro';
import { db, getSupabase } from '../../lib/db';
import { storage } from '../../lib/storage';

export const GET: APIRoute = async () => {
  try {
    const isSupabase = db.isSupabaseConnected();
    let supabaseStatus = isSupabase ? 'connected' : 'local_fallback';
    let storageStatus = 'local';
    let missingTables: string[] = [];

    const client = getSupabase();
    if (client) {
      try {
        // Test primary tables
        const checkTables = ['profiles', 'candidates', 'leads', 'jobs', 'internships', 'testimonials', 'applications'];
        for (const tbl of checkTables) {
          const { error } = await client.from(tbl).select('id').limit(1);
          if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
            missingTables.push(tbl);
          }
        }

        // Test Storage buckets
        const { data: buckets } = await client.storage.listBuckets();
        if (buckets) {
          storageStatus = buckets.map(b => b.name).join(', ') || 'no_buckets';
        }
      } catch (e: any) {
        supabaseStatus = `degraded: ${e.message}`;
      }
    }

    const stats = await db.getDashboardStats();

    return new Response(JSON.stringify({
      status: 'ok',
      server: 'online',
      database: supabaseStatus,
      storage: storageStatus,
      storageMode: storage.isSupabaseConfigured() ? 'supabase' : 'local',
      missingMigrations: missingTables.length > 0 ? missingTables : 'none',
      metrics: {
        totalResumes: stats.totalResumes,
        totalApplications: stats.totalApplications,
        totalLeads: stats.totalLeads,
        activeJobs: stats.activeJobs,
        activeInternships: stats.activeInternships
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
