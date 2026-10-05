// ============================================================
// Knowletive Security & Authentication System
// PBKDF2 Hashing, Secure Signed Sessions & RBAC
// ============================================================

import crypto from 'node:crypto';
import type { Profile, UserRole } from './types';

const SESSION_COOKIE_NAME = 'knowletive_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Fallback session secret if not in environment
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'knowletive_super_secure_secret_key_2026_salt_baner_pune';

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  exp: number; // Unix timestamp
}

/**
 * Hash password with PBKDF2 and a random cryptographic salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt:hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Sign session payload into tamper-proof token
 */
export function createSessionToken(profile: Profile): string {
  const payload: SessionPayload = {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract session payload from Request Cookie
 */
export function getAdminSession(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  return session;
}

/**
 * Check if request has verified Admin role
 */
export function isAdmin(request: Request): boolean {
  const session = getAdminSession(request);
  return !!session && session.role === 'admin';
}

/**
 * Generate Set-Cookie header string for session
 */
export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
}

/**
 * Generate Set-Cookie header to clear session
 */
export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
