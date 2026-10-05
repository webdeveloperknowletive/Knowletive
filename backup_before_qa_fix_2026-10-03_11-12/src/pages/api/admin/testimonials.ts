// ============================================================
// /api/admin/testimonials
// CRUD & Dynamic Testimonial Publishing
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { Testimonial } from '../../../lib/types';

const PUBLIC_UPLOADS_DIR = path.resolve('public/uploads/testimonials');

export const GET: APIRoute = async () => {
  const list = await db.getTestimonials(false);
  return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
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
    id = (formData.get('id') as string) || '';
    studentName = (formData.get('studentName') as string) || '';
    program = (formData.get('program') as string) || '';
    caption = (formData.get('caption') as string) || '';
    videoUrl = (formData.get('videoUrl') as string) || '';
    posterUrl = (formData.get('posterUrl') as string) || '';
    displayOrder = parseInt((formData.get('displayOrder') as string) || '0', 10);
    isPublished = formData.get('isPublished') === 'true';

    // Handle video file upload if provided
    const videoFile = formData.get('videoFile') as File | null;
    if (videoFile && videoFile instanceof File && videoFile.size > 0) {
      if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
      const safeVideoName = `${crypto.randomUUID()}.mp4`;
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safeVideoName), videoBuffer);
      videoUrl = `/uploads/testimonials/${safeVideoName}`;
    }

    // Handle poster file upload if provided
    const posterFile = formData.get('posterFile') as File | null;
    if (posterFile && posterFile instanceof File && posterFile.size > 0) {
      if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
      const ext = path.extname(posterFile.name) || '.jpg';
      const safePosterName = `${crypto.randomUUID()}${ext}`;
      const posterBuffer = Buffer.from(await posterFile.arrayBuffer());
      fs.writeFileSync(path.join(PUBLIC_UPLOADS_DIR, safePosterName), posterBuffer);
      posterUrl = `/uploads/testimonials/${safePosterName}`;
    }
  } else {
    const body = await request.json();
    id = body.id || '';
    studentName = body.studentName || '';
    program = body.program || '';
    caption = body.caption || '';
    videoUrl = body.videoUrl || '';
    posterUrl = body.posterUrl || '';
    displayOrder = body.displayOrder || 0;
    isPublished = body.isPublished !== undefined ? Boolean(body.isPublished) : true;
  }

  if (!studentName || !program || !videoUrl) {
    return new Response(JSON.stringify({ error: 'Student name, program, and video URL are required.' }), { status: 400 });
  }

  // Fallback poster if not provided to guarantee NO black story cards
  if (!posterUrl) {
    posterUrl = '/images/hero-students.jpg';
  }

  const testimonial: Testimonial = {
    id: id || crypto.randomUUID(),
    student_name: studentName.trim(),
    program: program.trim(),
    caption: caption ? caption.trim() : undefined,
    video_url: videoUrl,
    poster_url: posterUrl,
    display_order: displayOrder,
    is_published: isPublished,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const saved = await db.saveTestimonial(testimonial);
  return new Response(JSON.stringify({ success: true, testimonial: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, isPublished, displayOrder } = body;
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  const list = await db.getTestimonials(false);
  const item = list.find(t => t.id === id);
  if (!item) return new Response(JSON.stringify({ error: 'Testimonial not found' }), { status: 404 });

  if (isPublished !== undefined) item.is_published = Boolean(isPublished);
  if (displayOrder !== undefined) item.display_order = Number(displayOrder);

  const saved = await db.saveTestimonial(item);
  return new Response(JSON.stringify({ success: true, testimonial: saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteTestimonial(id);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
