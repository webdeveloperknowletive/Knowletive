// ============================================================
// POST /api/analytics
// Public endpoint for receiving anonymous analytics beacons
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import type { AnalyticsSession, AnalyticsPageview, AnalyticsSection, AnalyticsEvent } from '../../../lib/types';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    if (data.session) {
      const { visitor_id, session_id, device_type, referrer, url } = data.session;
      const parsedUrl = new URL(url || 'http://localhost');
      const utm_source = parsedUrl.searchParams.get('utm_source') || undefined;
      const utm_medium = parsedUrl.searchParams.get('utm_medium') || undefined;
      const utm_campaign = parsedUrl.searchParams.get('utm_campaign') || undefined;
      
      const session: AnalyticsSession = {
        id: crypto.randomUUID(),
        visitor_id,
        session_id,
        started_at: new Date().toISOString(),
        ended_at: null,
        device_type: device_type || 'unknown',
        referrer: referrer || '',
        utm_source,
        utm_medium,
        utm_campaign
      };
      await db.saveAnalyticsSession(session);
    }
    
    if (data.pageview) {
      const { visitor_id, session_id, page_path, page_title, engaged_seconds } = data.pageview;
      const id = crypto.createHash('md5').update(`${session_id}_${page_path}`).digest('hex'); 
      const pv: AnalyticsPageview = {
        id,
        visitor_id,
        session_id,
        page_path,
        page_title,
        started_at: new Date().toISOString(),
        engaged_seconds: engaged_seconds || 0
      };
      await db.saveAnalyticsPageview(pv);
    }
    
    if (data.sections && Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        const { visitor_id, session_id, page_path, section_id, engaged_seconds } = sec;
        const id = crypto.createHash('md5').update(`${session_id}_${page_path}_${section_id}`).digest('hex');
        const analyticsSec: AnalyticsSection = {
          id,
          visitor_id,
          session_id,
          page_path,
          section_id,
          engaged_seconds: engaged_seconds || 0,
          viewed_at: new Date().toISOString()
        };
        await db.saveAnalyticsSection(analyticsSec);
      }
    }
    
    if (data.events && Array.isArray(data.events)) {
      for (const evt of data.events) {
        const { visitor_id, session_id, event_name, page_path, metadata } = evt;
        const ev: AnalyticsEvent = {
          id: crypto.randomUUID(),
          visitor_id,
          session_id,
          event_name,
          page_path,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        };
        await db.saveAnalyticsEvent(ev);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[API Analytics Error]:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
