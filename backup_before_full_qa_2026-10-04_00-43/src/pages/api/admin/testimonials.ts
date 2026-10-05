// ============================================================
// /api/admin/testimonials
// Complete CRUD & Dynamic Testimonial / Story Publishing (Admin RBAC Protected)
// Handles MP4 video & poster uploads, auto-ordering, editing, toggling & cleanup
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';
import type { Testimonial } from '../../../lib/types';

const PUBLIC_UPLOADS_DIR = path.resolve('public/uploads/testimonials');
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_POSTER_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v'];
const ALLOWED_POSTER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

export const GET: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), {
      status: 403,
      headers: getCorsHeaders(request)
    });
  }

  const list = await db.getTestimonials(false);
  return new Response(JSON.stringify({ success: true, testimonials: list }), {
    status: 200,
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
    const contentType = request.headers.get('content-type') || '';
    let id = '';
    let studentName = '';
    let program = '';
    let caption = '';
    let videoUrl = '';
    let posterUrl = '';
    let displayOrder = 0;
    let isPublished = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = ((formData.get('id') as string) || '').trim();
      studentName = ((formData.get('studentName') as string) || (formData.get('student_name') as string) || '').trim();
      program = ((formData.get('program') as string) || '').trim();
      caption = ((formData.get('caption') as string) || '').trim();
      videoUrl = ((formData.get('videoUrl') as string) || (formData.get('video_url') as string) || '').trim();
      posterUrl = ((formData.get('posterUrl') as string) || (formData.get('poster_url') as string) || '').trim();
      displayOrder = parseInt((formData.get('displayOrder') as string) || (formData.get('display_order') as string) || '0', 10) || 0;
      
      const publishVal = formData.get('isPublished') ?? formData.get('is_published');
      isPublished = publishVal === null ? true : (publishVal === 'true' || publishVal === 'on' || publishVal === '1');

      // 1. Process Video File upload
      const videoFile = (formData.get('videoFile') || formData.get('video')) as File | null;
      if (videoFile && videoFile instanceof File && videoFile.size > 0) {
        if (videoFile.size > MAX_VIDEO_SIZE) {
          return new Response(JSON.stringify({ error: 'Video file exceeds the 100 MB maximum size limit.' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        const ext = path.extname(videoFile.name).toLowerCase() || '.mp4';
        if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
          return new Response(JSON.stringify({ error: `Unsupported video format (${ext}). Allowed: MP4, WebM, MOV.` }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
          fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
        }

        const safeVideoName = `${crypto.randomUUID()}${ext}`;
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safeVideoName), videoBuffer);
        videoUrl = `/uploads/testimonials/${safeVideoName}`;
      }

      // 2. Process Poster Thumbnail Image upload
      const posterFile = (formData.get('posterFile') || formData.get('poster')) as File | null;
      if (posterFile && posterFile instanceof File && posterFile.size > 0) {
        if (posterFile.size > MAX_POSTER_SIZE) {
          return new Response(JSON.stringify({ error: 'Poster image exceeds the 10 MB maximum size limit.' }), {
            status: 400,
            headers: getCorsHeaders(request)
          });
        }

        const ext = path.extname(posterFile.name).toLowerCase() || '.jpg';
        if (!ALLOWED_POSTER_EXTS.includes(ext)) {
          return new Response(JSON.stringify({ error: `Unsupported poster format (${ext}). Allowed: JPG, PNG, WEBP.` }), {
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
        posterUrl = `/uploads/testimonials/${safePosterName}`;
      }
    } else {
      const body = await request.json();
      id = (body.id || '').trim();
      studentName = (body.studentName || body.student_name || '').trim();
      program = (body.program || '').trim();
      caption = (body.caption || '').trim();
      videoUrl = (body.videoUrl || body.video_url || '').trim();
      posterUrl = (body.posterUrl || body.poster_url || '').trim();
      displayOrder = Number(body.displayOrder || body.display_order || 0);
      isPublished = body.isPublished !== undefined ? Boolean(body.isPublished) : (body.is_published !== undefined ? Boolean(body.is_published) : true);
    }

    // Required Field Validations
    if (!studentName) {
      return new Response(JSON.stringify({ error: 'Student Name is required.' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    if (!program) {
      return new Response(JSON.stringify({ error: 'Program / Course name is required.' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Please choose an MP4 video file or provide a valid video URL.' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    // Automatic Order calculation if not specified or 0
    const existing = await db.getTestimonials(false);
    if (!displayOrder || displayOrder <= 0) {
      const maxOrder = existing.reduce((max, t) => Math.max(max, t.display_order || 0), 0);
      displayOrder = maxOrder + 1;
    }

    // Fallback poster to guarantee 100% visible card without black screen
    if (!posterUrl) {
      posterUrl = '/images/hero-students.jpg';
    }

    const now = new Date().toISOString();
    const testimonial: Testimonial = {
      id: id || crypto.randomUUID(),
      student_name: studentName,
      program: program,
      caption: caption || undefined,
      video_url: videoUrl,
      poster_url: posterUrl,
      display_order: displayOrder,
      is_published: isPublished,
      created_at: now,
      updated_at: now
    };

    const saved = await db.saveTestimonial(testimonial);

    return new Response(JSON.stringify({
      success: true,
      message: 'Story reel published successfully!',
      testimonial: saved
    }), {
      status: 201,
      headers: getCorsHeaders(request)
    });
  } catch (err: any) {
    console.error('[API Admin Testimonials POST Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to save testimonial.' }), {
      status: 500,
      headers: getCorsHeaders(request)
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), {
      status: 403,
      headers: getCorsHeaders(request)
    });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let id = '';
    let updates: Partial<Testimonial> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = ((formData.get('id') as string) || '').trim();
      
      const studentName = formData.get('studentName') || formData.get('student_name');
      if (studentName !== null) updates.student_name = String(studentName).trim();

      const program = formData.get('program');
      if (program !== null) updates.program = String(program).trim();

      const caption = formData.get('caption');
      if (caption !== null) updates.caption = String(caption).trim();

      const videoUrl = formData.get('videoUrl') || formData.get('video_url');
      if (videoUrl !== null) updates.video_url = String(videoUrl).trim();

      const posterUrl = formData.get('posterUrl') || formData.get('poster_url');
      if (posterUrl !== null) updates.poster_url = String(posterUrl).trim();

      const displayOrder = formData.get('displayOrder') || formData.get('display_order');
      if (displayOrder !== null) updates.display_order = parseInt(String(displayOrder), 10) || 0;

      const isPublished = formData.get('isPublished') ?? formData.get('is_published');
      if (isPublished !== null) updates.is_published = isPublished === 'true' || isPublished === 'on' || isPublished === '1';

      // Check for replacement video file
      const videoFile = (formData.get('videoFile') || formData.get('video')) as File | null;
      if (videoFile && videoFile instanceof File && videoFile.size > 0) {
        if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
        const ext = path.extname(videoFile.name).toLowerCase() || '.mp4';
        const safeVideoName = `${crypto.randomUUID()}${ext}`;
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safeVideoName), videoBuffer);
        updates.video_url = `/uploads/testimonials/${safeVideoName}`;
      }

      // Check for replacement poster file
      const posterFile = (formData.get('posterFile') || formData.get('poster')) as File | null;
      if (posterFile && posterFile instanceof File && posterFile.size > 0) {
        if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
        const ext = path.extname(posterFile.name).toLowerCase() || '.jpg';
        const safePosterName = `${crypto.randomUUID()}${ext}`;
        const posterBuffer = Buffer.from(await posterFile.arrayBuffer());
        fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safePosterName), posterBuffer);
        updates.poster_url = `/uploads/testimonials/${safePosterName}`;
      }
    } else {
      const body = await request.json();
      id = (body.id || '').trim();
      if (body.studentName !== undefined || body.student_name !== undefined) {
        updates.student_name = String(body.studentName || body.student_name).trim();
      }
      if (body.program !== undefined) updates.program = String(body.program).trim();
      if (body.caption !== undefined) updates.caption = String(body.caption).trim();
      if (body.videoUrl !== undefined || body.video_url !== undefined) {
        updates.video_url = String(body.videoUrl || body.video_url).trim();
      }
      if (body.posterUrl !== undefined || body.poster_url !== undefined) {
        updates.poster_url = String(body.posterUrl || body.poster_url).trim();
      }
      if (body.displayOrder !== undefined || body.display_order !== undefined) {
        updates.display_order = Number(body.displayOrder || body.display_order);
      }
      if (body.isPublished !== undefined || body.is_published !== undefined) {
        updates.is_published = Boolean(body.isPublished ?? body.is_published);
      }
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing testimonial ID.' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const list = await db.getTestimonials(false);
    const existing = list.find(t => t.id === id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Testimonial not found.' }), {
        status: 404,
        headers: getCorsHeaders(request)
      });
    }

    // Ensure thumbnail_url and poster_url remain in sync
    if (updates.poster_url && !updates.thumbnail_url) {
      updates.thumbnail_url = updates.poster_url;
    } else if (updates.thumbnail_url && !updates.poster_url) {
      updates.poster_url = updates.thumbnail_url;
    }

    // If poster was replaced and old poster was a custom upload, clean up old file
    if (updates.poster_url && existing.poster_url && existing.poster_url !== updates.poster_url && existing.poster_url.startsWith('/uploads/testimonials/')) {
      const oldFileName = path.basename(existing.poster_url);
      const oldPath = path.join(PUBLIC_UPLOADS_DIR, oldFileName);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    const updated: Testimonial = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const saved = await db.saveTestimonial(updated);
    return new Response(JSON.stringify({
      success: true,
      message: 'Testimonial updated successfully',
      testimonial: saved
    }), {
      status: 200,
      headers: getCorsHeaders(request)
    });
  } catch (err: any) {
    console.error('[API Admin Testimonials PATCH Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to update testimonial.' }), {
      status: 500,
      headers: getCorsHeaders(request)
    });
  }
};

export const DELETE: APIRoute = async ({ url, request }) => {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), {
      status: 403,
      headers: getCorsHeaders(request)
    });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing testimonial ID to delete.' }), {
      status: 400,
      headers: getCorsHeaders(request)
    });
  }

  const list = await db.getTestimonials(false);
  const target = list.find(t => t.id === id);
  if (!target) {
    return new Response(JSON.stringify({ error: 'Testimonial not found.' }), {
      status: 404,
      headers: getCorsHeaders(request)
    });
  }

  // Clean up uploaded files if located in /uploads/testimonials/
  if (target.video_url && target.video_url.startsWith('/uploads/testimonials/')) {
    const videoFileName = path.basename(target.video_url);
    const videoDiskPath = path.join(PUBLIC_UPLOADS_DIR, videoFileName);
    if (fs.existsSync(videoDiskPath)) {
      try { fs.unlinkSync(videoDiskPath); } catch {}
    }
  }

  if (target.poster_url && target.poster_url.startsWith('/uploads/testimonials/')) {
    const posterFileName = path.basename(target.poster_url);
    const posterDiskPath = path.join(PUBLIC_UPLOADS_DIR, posterFileName);
    if (fs.existsSync(posterDiskPath)) {
      try { fs.unlinkSync(posterDiskPath); } catch {}
    }
  }

  await db.deleteTestimonial(id);
  return new Response(JSON.stringify({
    success: true,
    message: 'Testimonial deleted successfully.'
  }), {
    status: 200,
    headers: getCorsHeaders(request)
  });
};
