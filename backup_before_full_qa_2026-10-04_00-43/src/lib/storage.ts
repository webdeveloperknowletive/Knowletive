// ============================================================
// Knowletive Secure Storage System
// Handles 20MB limit, MIME checks, UUID renaming & Signed Downloads
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const STORAGE_DIR = path.resolve('.data/storage/candidate-resumes');
const MEDIA_DIR = path.resolve('.data/storage/media');

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id'));

export interface UploadResult {
  fileId: string;
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
}

export const storage = {
  /**
   * Validate and save an uploaded resume securely
   */
  async saveResume(file: File): Promise<UploadResult> {
    if (!file || file.size === 0) {
      throw new Error('No file provided or file is empty.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum size limit of 20 MB (received ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    const originalName = path.basename(file.name || 'resume.pdf');
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported file extension '${ext}'. Accepted formats are PDF, DOCX, and TXT.`);
    }

    // Inspect MIME type
    let mimeType = file.type || '';
    if (!mimeType) {
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.txt') mimeType = 'text/plain';
    }

    // Check buffer magic bytes for security against disguised executables
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify PDF header %PDF-
    if (ext === '.pdf') {
      const header = buffer.slice(0, 5).toString('ascii');
      if (!header.startsWith('%PDF')) {
        throw new Error('Invalid file contents: Not a valid PDF document.');
      }
    }

    // Verify DOCX header (ZIP magic bytes PK\x03\x04)
    if (ext === '.docx') {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
        throw new Error('Invalid file contents: Not a valid DOCX document.');
      }
    }

    // Generate safe UUID filename
    const fileId = crypto.randomUUID();
    const safeFileName = `${fileId}${ext}`;

    // Upload to Supabase if configured
    if (useSupabase) {
      try {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await client.storage
          .from('candidate-resumes')
          .upload(safeFileName, buffer, {
            contentType: mimeType,
            upsert: false
          });

        if (error) {
          console.warn('[Storage] Supabase upload failed, falling back to local:', error);
        } else {
          return {
            fileId,
            originalFileName: originalName,
            storagePath: `candidate-resumes/${safeFileName}`,
            mimeType,
            fileSize: file.size,
            downloadUrl: `/api/resumes/download?fileId=${fileId}`
          };
        }
      } catch (err) {
        console.warn('[Storage] Error during Supabase upload:', err);
      }
    }

    // Local secure storage fallback
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    const localFilePath = path.join(STORAGE_DIR, safeFileName);
    fs.writeFileSync(localFilePath, buffer);

    return {
      fileId,
      originalFileName: originalName,
      storagePath: safeFileName,
      mimeType,
      fileSize: file.size,
      downloadUrl: `/api/resumes/download?fileId=${fileId}`
    };
  },

  /**
   * Retrieve file buffer for secure preview or download
   */
  async getResumeBuffer(fileId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
    // Check local storage first
    if (fs.existsSync(STORAGE_DIR)) {
      const files = fs.readdirSync(STORAGE_DIR);
      const match = files.find(f => f.startsWith(fileId));
      if (match) {
        const filePath = path.join(STORAGE_DIR, match);
        const ext = path.extname(match).toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === '.pdf') mime = 'application/pdf';
        else if (ext === '.docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.txt') mime = 'text/plain';

        return {
          buffer: fs.readFileSync(filePath),
          fileName: match,
          mimeType: mime
        };
      }
    }

    // Check Supabase if configured
    if (useSupabase) {
      try {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY);
        for (const ext of ALLOWED_EXTENSIONS) {
          const pathName = `${fileId}${ext}`;
          const { data, error } = await client.storage.from('candidate-resumes').download(pathName);
          if (data && !error) {
            const arr = await data.arrayBuffer();
            return {
              buffer: Buffer.from(arr),
              fileName: pathName,
              mimeType: data.type || 'application/octet-stream'
            };
          }
        }
      } catch (err) {
        console.error('[Storage] Supabase download error:', err);
      }
    }

    return null;
  },

  /**
   * Count how many physical resume files are currently in storage
   */
  async countResumeFiles(): Promise<number> {
    let count = 0;
    if (fs.existsSync(STORAGE_DIR)) {
      count = fs.readdirSync(STORAGE_DIR).filter(f => ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase())).length;
    }
    return count;
  },

  /**
   * Securely delete all resume files from storage without touching media
   */
  async deleteAllResumes(): Promise<number> {
    let deletedCount = 0;

    // 1. Clean local storage directory
    if (fs.existsSync(STORAGE_DIR)) {
      const files = fs.readdirSync(STORAGE_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(STORAGE_DIR, file));
          deletedCount++;
        } catch (e) {
          console.error(`[Storage] Failed to unlink resume file ${file}:`, e);
        }
      }
    }

    // 2. Clean Supabase bucket if enabled
    if (useSupabase) {
      try {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: list, error: listErr } = await client.storage.from('candidate-resumes').list();
        if (list && list.length > 0) {
          const names = list.map(f => f.name);
          const { data: removed, error: remErr } = await client.storage.from('candidate-resumes').remove(names);
          if (removed) {
            deletedCount += removed.length;
          }
        }
      } catch (err) {
        console.error('[Storage] Error removing resumes from Supabase bucket:', err);
      }
    }

    return deletedCount;
  }
};
