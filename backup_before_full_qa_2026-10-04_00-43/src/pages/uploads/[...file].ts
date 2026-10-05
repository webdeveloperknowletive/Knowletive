// ============================================================
// /uploads/[...file]
// Universal Static & Streaming Media Route
// Supports MP4 Video Range Seeking, Mobile Streaming, Images & Documents
// Works in both development mode and standalone production builds
// ============================================================

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

const BASE_UPLOADS_DIR = path.resolve('public/uploads');

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  const relativePath = params.file;
  if (!relativePath) {
    return new Response('File path missing', { status: 400 });
  }

  // Prevent directory traversal attacks
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.resolve(BASE_UPLOADS_DIR, safePath);

  if (!absolutePath.startsWith(BASE_UPLOADS_DIR) || !fs.existsSync(absolutePath)) {
    return new Response('File not found', { status: 404 });
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    return new Response('Access denied', { status: 403 });
  }

  const fileSize = stat.size;
  const mimeType = getMimeType(absolutePath);
  const range = request.headers.get('range');

  // Support HTTP 206 Partial Content for video seeking on Safari / Chrome / Mobile
  if (range && mimeType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` }
      });
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(absolutePath, { start, end });
    const nodeStream = (fileStream as any);

    return new Response(nodeStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }

  // Full file response
  const fileStream = fs.createReadStream(absolutePath);
  return new Response(fileStream as any, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
