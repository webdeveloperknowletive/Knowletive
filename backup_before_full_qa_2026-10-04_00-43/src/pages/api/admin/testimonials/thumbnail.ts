// ============================================================
// /api/admin/testimonials/thumbnail
// Dedicated Endpoint to Update a Single Story's Thumbnail Independently
// Guarantees zero leakage or cross-contamination between cards
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../../../lib/db';
import { isAdmin } from '../../../../lib/auth';

const PUBLIC_UPLOADS_DIR = path.resolve('public/uploads/testimonials');
const MAX_POSTER_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_POSTER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), {
      status: 403,
      headers: getCorsHeaders(request)
    });
  }

  try {
    let id = '';
    let newThumbnailUrl = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = String(formData.get('id') || formData.get('storyId') || '').trim();
      const directUrl = formData.get('thumbnailUrl') || formData.get('posterUrl');
      if (directUrl) newThumbnailUrl = String(directUrl).trim();

      const posterFile = (formData.get('thumbnailFile') || formData.get('posterFile') || formData.get('file')) as File | null;
      if (posterFile && posterFile instanceof File && posterFile.size > 0) {
        if (posterFile.size > MAX_POSTER_SIZE) {
          return new Response(JSON.stringify({ error: 'Thumbnail image exceeds the 10 MB maximum size limit.' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        const ext = path.extname(posterFile.name).toLowerCase() || '.jpg';
        if (!ALLOWED_POSTER_EXTS.includes(ext)) {
          return new Response(JSON.stringify({ error: `Unsupported image format (${ext}). Allowed: JPG, PNG, WEBP.` }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
          fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
        }

        const safePosterName = `${crypto.randomUUID()}${ext}`;
        const posterBuffer = Buffer.from(await posterFile.arrayBuffer());
        fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safePosterName), posterBuffer);
        newThumbnailUrl = `/uploads/testimonials/${safePosterName}`;
      }
    } else {
      const body = await request.json();
      id = String(body.id || body.storyId || '').trim();
      newThumbnailUrl = String(body.thumbnailUrl || body.posterUrl || '').trim();
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Story ID is required to update its thumbnail.' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const story = await db.getTestimonialById(id);
    if (!story) {
      return new Response(JSON.stringify({ error: `Story not found for ID: ${id}` }), {
        status: 404,
        headers: getCorsHeaders(request)
      });
    }

    // Default to fallback if no new thumbnail was provided (e.g. reset action)
    if (!newThumbnailUrl) {
      newThumbnailUrl = '/images/hero-students.jpg';
    }

    // Clean up old custom uploaded file if unique to this story
    if (story.poster_url && story.poster_url.startsWith('/uploads/testimonials/') && story.poster_url !== newThumbnailUrl) {
      const oldFileName = path.basename(story.poster_url);
      const oldFilePath = path.join(PUBLIC_UPLOADS_DIR, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch {}
      }
    }

    // Save strictly to this target story record only
    story.poster_url = newThumbnailUrl;
    story.thumbnail_url = newThumbnailUrl;
    const saved = await db.saveTestimonial(story);

    return new Response(JSON.stringify({
      success: true,
      message: `Thumbnail updated successfully for ${saved.student_name}.`,
      id: saved.id,
      thumbnailUrl: saved.poster_url,
      testimonial: saved
    }), {
      status: 200,
      headers: getCorsHeaders(request)
    });
  } catch (err: any) {
    console.error('[API Testimonial Thumbnail Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update thumbnail.' }), {
      status: 500,
      headers: getCorsHeaders(request)
    });
  }
};
