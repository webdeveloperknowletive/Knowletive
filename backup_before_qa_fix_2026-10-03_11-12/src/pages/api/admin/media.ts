// ============================================================
// /api/admin/media
// Media Library Upload & Management
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../../../lib/db';
import type { MediaItem } from '../../../lib/types';

const MEDIA_UPLOAD_DIR = path.resolve('public/uploads/media');

export const GET: APIRoute = async () => {
  const media = await db.getMedia();
  return new Response(JSON.stringify(media), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';

    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Please choose a file to upload.' }), { status: 400 });
    }

    if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
      fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(MEDIA_UPLOAD_DIR, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    let type: 'image' | 'video' | 'poster' | 'document' = 'image';
    if (file.type.startsWith('video/') || ext === '.mp4') type = 'video';
    else if (ext === '.pdf' || ext === '.docx') type = 'document';

    const item: MediaItem = {
      id: crypto.randomUUID(),
      type,
      title: title || file.name,
      file_url: `/uploads/media/${safeName}`,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      created_at: new Date().toISOString()
    };

    const saved = await db.saveMedia(item);
    return new Response(JSON.stringify({ success: true, item: saved }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[API Media Upload Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to upload media.' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

  await db.deleteMedia(id);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
