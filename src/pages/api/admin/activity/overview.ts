// src/pages/api/admin/activity/overview.ts
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { getAdminSession } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  const session = getAdminSession(request);
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const range = url.searchParams.get('range') || '7d';
    
    const allSessions = await db.getAnalyticsSessions();
    const allPageviews = await db.getAnalyticsPageviews();
    const allSections = await db.getAnalyticsSections();

    const now = new Date();
    let startDate = new Date(0);
    
    if (range === 'today') {
      startDate = new Date(now.setHours(0,0,0,0));
    } else if (range === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0,0,0,0);
      startDate = y;
    } else if (range === '7d') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (range === '30d') {
      startDate = new Date(now.setDate(now.getDate() - 30));
    }
    
    const sessions = allSessions.filter(s => new Date(s.started_at) >= startDate);
    const pageviews = allPageviews.filter(p => new Date(p.started_at) >= startDate);
    const sections = allSections.filter(s => new Date(s.viewed_at) >= startDate);

    // 1. Top Cards
    const totalVisitors = new Set(allSessions.map(s => s.visitor_id)).size;
    const uniqueVisitors = new Set(sessions.map(s => s.visitor_id)).size;
    
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const visitorsToday = new Set(allSessions.filter(s => new Date(s.started_at) >= todayStart).map(s => s.visitor_id)).size;
    
    const totalPageViews = pageviews.length;
    
    const sessionDurationMap = new Map<string, number>();
    pageviews.forEach(p => {
      sessionDurationMap.set(p.session_id, (sessionDurationMap.get(p.session_id) || 0) + p.engaged_seconds);
    });
    const totalDuration = Array.from(sessionDurationMap.values()).reduce((a, b) => a + b, 0);
    const avgSessionSeconds = sessions.length > 0 ? Math.floor(totalDuration / sessions.length) : 0;

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeVisitors = new Set(
      allPageviews.filter(p => new Date(p.started_at).getTime() + (p.engaged_seconds * 1000) >= fiveMinsAgo.getTime()).map(p => p.visitor_id)
    ).size;

    // 2. Most Visited Pages
    const pagesMap = new Map<string, { visitors: Set<string>, views: number, time: number }>();
    pageviews.forEach(p => {
      const path = p.page_path;
      if (!pagesMap.has(path)) pagesMap.set(path, { visitors: new Set(), views: 0, time: 0 });
      const stats = pagesMap.get(path)!;
      stats.visitors.add(p.visitor_id);
      stats.views += 1;
      stats.time += p.engaged_seconds;
    });
    const mostVisitedPages = Array.from(pagesMap.entries()).map(([path, stats]) => ({
      path,
      visitors: stats.visitors.size,
      views: stats.views,
      avgTime: stats.views > 0 ? Math.floor(stats.time / stats.views) : 0
    })).sort((a, b) => b.views - a.views).slice(0, 10);

    // 3. Most Engaged Sections
    const sectionsMap = new Map<string, { views: number, time: number, path: string }>();
    sections.forEach(s => {
      const key = `${s.page_path}::${s.section_id}`;
      if (!sectionsMap.has(key)) sectionsMap.set(key, { views: 0, time: 0, path: s.page_path });
      const stats = sectionsMap.get(key)!;
      stats.views += 1;
      stats.time += s.engaged_seconds;
    });
    const mostEngagedSections = Array.from(sectionsMap.entries()).map(([key, stats]) => ({
      section: key.split('::')[1],
      path: stats.path,
      views: stats.views,
      avgTime: stats.views > 0 ? Math.floor(stats.time / stats.views) : 0,
      totalTime: stats.time
    })).sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);

    // 4. Device Breakdown
    const devices = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
    sessions.forEach(s => devices[s.device_type] = (devices[s.device_type] || 0) + 1);

    // 5. Traffic Source
    const sources = { direct: 0, google: 0, social: 0, referral: 0, other: 0 };
    sessions.forEach(s => {
      if (s.utm_source) {
        if (s.utm_source.includes('google')) sources.google++;
        else if (['facebook', 'instagram', 'linkedin', 'twitter'].includes(s.utm_source)) sources.social++;
        else sources.other++;
      } else if (!s.referrer || s.referrer === '') {
        sources.direct++;
      } else if (s.referrer.includes('google.com')) {
        sources.google++;
      } else if (s.referrer.includes('facebook.com') || s.referrer.includes('linkedin.com') || s.referrer.includes('instagram.com') || s.referrer.includes('t.co')) {
        sources.social++;
      } else {
        sources.referral++;
      }
    });

    // 6. Trend
    const trendMap = new Map<string, Set<string>>();
    sessions.forEach(s => {
      const dateStr = new Date(s.started_at).toISOString().split('T')[0];
      if (!trendMap.has(dateStr)) trendMap.set(dateStr, new Set());
      trendMap.get(dateStr)!.add(s.visitor_id);
    });
    const trend = Array.from(trendMap.entries())
      .map(([date, set]) => ({ date, visitors: set.size }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    return new Response(JSON.stringify({
      cards: { totalVisitors, visitorsToday, uniqueVisitors, totalPageViews, avgSessionSeconds, activeVisitors },
      mostVisitedPages,
      mostEngagedSections,
      devices,
      sources,
      trend
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[API Admin Activity Error]:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
