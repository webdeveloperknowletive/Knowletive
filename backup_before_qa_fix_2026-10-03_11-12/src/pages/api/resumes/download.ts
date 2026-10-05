// ============================================================
// GET /api/resumes/download
// Protected Resume File Streaming Endpoint for Authenticated Admins
// ============================================================

import type { APIRoute } from 'astro';
import { storage } from '../../../lib/storage';
import { db } from '../../../lib/db';

export const GET: APIRoute = async ({ request, url }) => {
  const fileId = url.searchParams.get('fileId');
  const candidateId = url.searchParams.get('candidateId');
  const inline = url.searchParams.get('inline') === 'true';

  let targetFileId = fileId;

  if (!targetFileId && candidateId) {
    const candidate = await db.getCandidateById(candidateId);
    if (candidate && candidate.resume_file_url) {
      const match = candidate.resume_file_url.match(/fileId=([a-zA-Z0-9_-]+)/);
      if (match) targetFileId = match[1];
    }
  }

  if (!targetFileId) {
    return new Response('File identifier missing.', { status: 400 });
  }

  const fileData = await storage.getResumeBuffer(targetFileId);
  if (!fileData) {
    return new Response('Resume file not found in storage.', { status: 404 });
  }

  const disposition = inline ? 'inline' : `attachment; filename="${fileData.fileName}"`;

  return new Response(fileData.buffer, {
    status: 200,
    headers: {
      'Content-Type': fileData.mimeType,
      'Content-Disposition': disposition,
      'Content-Length': fileData.buffer.length.toString(),
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};
