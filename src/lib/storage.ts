// ============================================================
// Knowletive Secure Storage System
// Handles 20MB limit, MIME checks, UUID renaming & Signed Downloads
// Supports Supabase Storage (candidate-resumes & media buckets)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_DIR = process.env.VERCEL ? '/tmp/candidate-resumes' : path.resolve('.data/storage/candidate-resumes');
const LOCAL_MEDIA_DIR = process.env.VERCEL ? '/tmp/uploads' : path.resolve('public/uploads');

const MAX_RESUME_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const ALLOWED_MEDIA_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.mp4', '.webm', '.mov',
  '.pdf', '.docx'
];

function getEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  return '';
}

function isSupabaseConfigured(): boolean {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
  return Boolean(url && key && !url.includes('your-project-id'));
}

let _storageClient: SupabaseClient | null = null;
function getStorageClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_storageClient) {
    const url = getEnv('SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
    _storageClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _storageClient;
}

export interface UploadResult {
  fileId: string;
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
}

export interface MediaUploadResult {
  fileId: string;
  originalFileName: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
}

export const storage = {
  isSupabaseConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Validate and save an uploaded resume securely
   */
  async saveResume(file: File): Promise<UploadResult> {
    if (!file || file.size === 0) {
      throw new Error('No file provided or file is empty.');
    }

    if (file.size > MAX_RESUME_SIZE) {
      throw new Error(`File exceeds maximum size limit of 20 MB (received ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    const originalName = path.basename(file.name || 'resume.pdf');
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
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
    if (isSupabaseConfigured()) {
      const client = getStorageClient();
      if (client) {
        const { error } = await client.storage
          .from('candidate-resumes')
          .upload(safeFileName, buffer, {
            contentType: mimeType,
            upsert: false
          });

        if (error) {
          console.error('[Storage] Supabase resume upload failed:', error);
          throw new Error(`Failed to save resume in Supabase Storage: ${error.message}`);
        }

        return {
          fileId,
          originalFileName: originalName,
          storagePath: `candidate-resumes/${safeFileName}`,
          mimeType,
          fileSize: file.size,
          downloadUrl: `/api/resumes/download?fileId=${fileId}`
        };
      }
    }

    // Local secure storage fallback (for offline dev only)
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
   * Delete an uploaded resume file to prevent orphaned files on partial submission failure
   */
  async deleteResume(storagePathOrFileId: string): Promise<boolean> {
    try {
      const fileName = path.basename(storagePathOrFileId);
      if (isSupabaseConfigured()) {
        const client = getStorageClient();
        if (client) {
          await client.storage.from('candidate-resumes').remove([fileName]);
          return true;
        }
      }

      if (fs.existsSync(STORAGE_DIR)) {
        const localPath = path.join(STORAGE_DIR, fileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Storage] Could not delete resume:', err);
    }
    return false;
  },

  /**
   * Retrieve file buffer for secure preview or download
   */
  async getResumeBuffer(fileId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
    // Check Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        const client = getStorageClient();
        if (client) {
          for (const ext of ALLOWED_RESUME_EXTENSIONS) {
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
        }
      } catch (err) {
        console.error('[Storage] Supabase download error:', err);
      }
    }

    // Check local storage fallback
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

    return null;
  },

  /**
   * Save media file (images, videos, posters) to Supabase Storage 'media' public bucket
   */
  async saveMediaFile(file: File, folder = 'media'): Promise<MediaUploadResult> {
    if (!file || file.size === 0) {
      throw new Error('No file provided or file is empty.');
    }

    if (file.size > MAX_MEDIA_SIZE) {
      throw new Error(`File exceeds maximum size limit of 50 MB (received ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    const originalName = path.basename(file.name || 'upload.jpg');
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported media extension '${ext}'. Allowed: JPG, PNG, WEBP, GIF, MP4, WebM, PDF.`);
    }

    const fileId = crypto.randomUUID();
    const safeFileName = `${fileId}${ext}`;
    const storagePath = `${folder}/${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/octet-stream';

    // Upload to Supabase 'media' bucket if configured
    if (isSupabaseConfigured()) {
      const client = getStorageClient();
      if (client) {
        const { error } = await client.storage
          .from('media')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (error) {
          console.error('[Storage] Supabase media upload failed:', error);
          throw new Error(`Failed to upload media to Supabase Storage: ${error.message}`);
        }

        const { data: urlData } = client.storage.from('media').getPublicUrl(storagePath);
        return {
          fileId,
          originalFileName: originalName,
          fileUrl: urlData.publicUrl,
          storagePath,
          mimeType,
          fileSize: file.size
        };
      }
    }

    // Local fallback
    const targetDir = path.join(LOCAL_MEDIA_DIR, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const localFilePath = path.join(targetDir, safeFileName);
    fs.writeFileSync(localFilePath, buffer);

    return {
      fileId,
      originalFileName: originalName,
      fileUrl: `/uploads/${folder}/${safeFileName}`,
      storagePath,
      mimeType,
      fileSize: file.size
    };
  },

  /**
   * Delete media file from Supabase Storage or local disk
   */
  async deleteMediaFile(fileUrlOrPath: string): Promise<boolean> {
    try {
      if (!fileUrlOrPath) return false;

      // Check if it's a Supabase storage URL
      if (fileUrlOrPath.includes('/storage/v1/object/public/media/')) {
        const relativePath = fileUrlOrPath.split('/storage/v1/object/public/media/')[1];
        if (relativePath && isSupabaseConfigured()) {
          const client = getStorageClient();
          if (client) {
            await client.storage.from('media').remove([decodeURIComponent(relativePath)]);
            return true;
          }
        }
      }

      // Check if it's a local upload URL (/uploads/...)
      if (fileUrlOrPath.startsWith('/uploads/')) {
        const rel = fileUrlOrPath.replace('/uploads/', '');
        const localPath = path.join(LOCAL_MEDIA_DIR, rel);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Storage] Could not delete media file:', err);
    }
    return false;
  },

  /**
   * Count how many physical resume files are currently in storage
   */
  async countResumeFiles(): Promise<number> {
    let count = 0;
    if (isSupabaseConfigured()) {
      try {
        const client = getStorageClient();
        if (client) {
          const { data } = await client.storage.from('candidate-resumes').list();
          if (data) return data.length;
        }
      } catch {}
    }
    if (fs.existsSync(STORAGE_DIR)) {
      count = fs.readdirSync(STORAGE_DIR).filter(f => ALLOWED_RESUME_EXTENSIONS.includes(path.extname(f).toLowerCase())).length;
    }
    return count;
  }
};
