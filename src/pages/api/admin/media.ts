// ============================================================
// /api/admin/media
// Media Library Upload, Update & Management (Admin RBAC Protected)
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { MediaItem } from '../../../lib/types';

const MEDIA_UPLOAD_DIR = path.resolve('public/uploads/media');

export const GET: APIRoute = async ({ url }) => {
  const category = url.searchParams.get('category') || undefined;
  const media = await db.getMedia(category, false);
  return new Response(JSON.stringify(media), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = ((formData.get('title') as string) || '').trim();
    const description = ((formData.get('description') as string) || '').trim();
    let category = ((formData.get('category') as string) || 'activities').toLowerCase().trim();
    if (category.includes('activit')) category = 'activities';

    const publishRaw = formData.get('is_published');
    const isPublished = publishRaw === null ? true : (publishRaw === 'true' || publishRaw === 'on' || publishRaw === '1');
    const displayOrder = parseInt((formData.get('display_order') as string) || '0', 10) || 0;

    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Please choose a valid file to upload.' }), { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.pdf', '.docx'];
    if (!allowedExtensions.includes(ext)) {
      return new Response(JSON.stringify({ error: `File type ${ext} is not allowed. Accepted: JPG, PNG, WEBP, MP4, WEBM.` }), { status: 400 });
    }

    if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
      fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
    }

    const safeName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(MEDIA_UPLOAD_DIR, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    let type: 'image' | 'video' | 'poster' | 'document' = 'image';
    if (file.type.startsWith('video/') || ext === '.mp4' || ext === '.webm') {
      type = 'video';
    } else if (ext === '.pdf' || ext === '.docx') {
      type = 'document';
    }

    const item: MediaItem = {
      id: crypto.randomUUID(),
      type,
      media_type: type,
      title: title || file.name,
      description: description || undefined,
      category: category as any,
      is_published: isPublished,
      display_order: displayOrder,
      file_url: `/uploads/media/${safeName}`,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await db.saveMedia(item);
    return new Response(JSON.stringify({ success: true, item: saved }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Media Upload Error]:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to upload media.' }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return new Response(JSON.stringify({ error: 'Missing media ID' }), { status: 400 });

    if (updates.category && String(updates.category).toLowerCase().includes('activit')) {
      updates.category = 'activities';
    }

    const updated = await db.updateMedia(id, updates);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Media item not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, item: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Media Update Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to update media item.' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteMedia(id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
