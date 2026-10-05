// ============================================================
// /api/media
// Public Media Endpoint - Read Published Media Assets
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category') || undefined;
    const publishedOnly = url.searchParams.get('published') !== 'false';

    const mediaList = await db.getMedia(category, publishedOnly);

    // Map to clean public response
    const publicData = mediaList.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || '',
      media_type: item.media_type || (item.type === 'video' ? 'video' : 'image'),
      type: item.type,
      category: item.category || 'activities',
      file_url: item.file_url,
      file_name: item.file_name,
      file_size: item.file_size,
      display_order: item.display_order ?? 0,
      created_at: item.created_at
    }));

    return new Response(JSON.stringify(publicData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('[API Public Media Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch public media.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
