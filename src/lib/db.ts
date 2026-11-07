// ============================================================
// Knowletive Database Layer
// Unified Supabase PostgreSQL + Resilient Local Mirror Store
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { 
  AnalyticsSession, AnalyticsPageview, AnalyticsSection, AnalyticsEvent, 
  Profile, JobRole, RoleKeyword, Candidate, Application, ApplicationType, 
  ApplicationStatus, ApplicationWithCandidate, ResumeKeywordMatch, 
  Lead, Job, Internship, Testimonial, MediaItem 
} from './types';
import { hashPassword } from './auth';

const DATA_DIR = path.resolve('.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function getEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  return '';
}

// Supabase environment check & initialization
export function isSupabaseConfigured(): boolean {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
  return Boolean(url && key && !url.includes('your-project-id'));
}

let _supabaseClient: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_supabaseClient) {
    try {
      const url = getEnv('SUPABASE_URL');
      const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
      _supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log('[DB] Connected to Supabase:', url);
    } catch (err) {
      console.warn('[DB] Supabase initialization failed, falling back to local store:', err);
    }
  }
  return _supabaseClient;
}

// Track missing columns and tables to adapt seamlessly across schema versions
const knownMissingColumns: Record<string, Set<string>> = {};
const knownMissingTables = new Set<string>();

/**
 * Resilient upsert that strips columns not yet created in PostgreSQL
 * and logs when tables need migrations.
 */
async function safeUpsert<T extends Record<string, any>>(table: string, record: T): Promise<T> {
  const client = getSupabase();
  if (!client || knownMissingTables.has(table)) {
    return record;
  }

  let payload = { ...record };
  if (knownMissingColumns[table]) {
    for (const col of knownMissingColumns[table]) {
      delete payload[col];
    }
  }

  let { data, error } = await client.from(table).upsert(payload).select().single();

  while (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn(`[DB] Supabase table '${table}' does not exist yet in schema cache. Run migrations/006_supabase_fix_all.sql to enable remote persistence.`);
      knownMissingTables.add(table);
      return record;
    }

    const match = error.message?.match(/Could not find the '([\w]+)' column/i) ||
                  error.message?.match(/column (?:[\w]+\.)?([\w]+) does not exist/i) ||
                  (error.details && error.details.match(/column (?:[\w]+\.)?([\w]+) does not exist/i));

    if (match && match[1] && match[1] in payload) {
      const missingCol = match[1];
      console.warn(`[DB] Supabase table '${table}' is missing column '${missingCol}'. Stripping for compatibility and retrying...`);
      if (!knownMissingColumns[table]) knownMissingColumns[table] = new Set();
      knownMissingColumns[table].add(missingCol);
      delete payload[missingCol];

      const retry = await client.from(table).upsert(payload).select().single();
      data = retry.data;
      error = retry.error;
    } else {
      break;
    }
  }

  if (error) {
    console.error(`[DB] Upsert into '${table}' failed:`, error.message);
    throw error;
  }

  return { ...record, ...data };
}

// -------------------------------------------------------------
// LOCAL DATA STORE INTERFACE (For Local Dev & Resilient Mirror)
// -------------------------------------------------------------
interface LocalDatabase {
  profiles: Profile[];
  job_roles: JobRole[];
  role_keywords: RoleKeyword[];
  candidates: Candidate[];
  applications: Application[];
  resume_keyword_matches: ResumeKeywordMatch[];
  leads: Lead[];
  jobs: Job[];
  internships: Internship[];
  testimonials: Testimonial[];
  media_library: MediaItem[];
  analytics_sessions?: AnalyticsSession[];
  analytics_pageviews?: AnalyticsPageview[];
  analytics_sections?: AnalyticsSection[];
  analytics_events?: AnalyticsEvent[];
}

function getInitialData(): LocalDatabase {
  const now = new Date().toISOString();
  
  const adminId = '00000000-0000-0000-0000-000000000001';
  const defaultAdmin: Profile = {
    id: adminId,
    email: getEnv('DEFAULT_ADMIN_EMAIL') || 'admin@knowletive.com',
    full_name: 'Knowletive Administrator',
    role: 'admin',
    password_hash: hashPassword(getEnv('DEFAULT_ADMIN_PASSWORD') || ''),
    created_at: now,
    updated_at: now
  };

  const roles: JobRole[] = [
    {
      id: '11111111-1111-1111-1111-111111111101',
      role_name: 'Data Analyst',
      slug: 'data-analyst',
      category: 'Data & Analytics',
      description: 'Extracts, processes, and analyzes data using statistical tools and SQL/PowerBI to support decision making.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      role_name: 'Data Scientist',
      slug: 'data-scientist',
      category: 'AI & Machine Learning',
      description: 'Develops ML and statistical models using Python, predictive modeling, and deep learning architectures.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      role_name: 'MERN Developer',
      slug: 'mern-developer',
      category: 'Software Engineering',
      description: 'Builds scalable full stack web applications using MongoDB, Express, React, and Node.js.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111104',
      role_name: 'Java Full Stack',
      slug: 'java-full-stack',
      category: 'Software Engineering',
      description: 'Develops enterprise solutions using Java, Spring Boot, Hibernate, microservices, and modern frontend.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111105',
      role_name: 'Cloud / DevOps',
      slug: 'cloud-devops',
      category: 'Cloud & Infrastructure',
      description: 'Designs CI/CD pipelines, container orchestration, and cloud infrastructure on AWS/Azure/GCP.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  const keywords: RoleKeyword[] = [
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'sql', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'power bi', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'excel', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'tableau', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'python', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'machine learning', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'python', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'react', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'node', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111104', keyword: 'java', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111105', keyword: 'aws', weight: 5, is_active: true, created_at: now }
  ];

  const testimonials: Testimonial[] = [
    {
      id: '22222222-2222-2222-2222-222222222201',
      student_name: 'Priya Sharma',
      program: 'Data Science & AI/ML',
      caption: 'Secured an offer as Associate Data Scientist after hands-on project portfolio coaching.',
      video_url: '/videos/testimonials/session-review-final.mp4',
      poster_url: '/videos/testimonials/posters/priya-sharma.jpg',
      thumbnail_url: '/videos/testimonials/posters/priya-sharma.jpg',
      display_order: 1,
      is_published: true,
      created_at: now,
      updated_at: now
    }
  ];

  const jobs: Job[] = [
    {
      id: '33333333-3333-3333-3333-333333333301',
      title: 'Junior Data Analyst',
      job_role_id: '11111111-1111-1111-1111-111111111101',
      company: 'Knowletive Placement Partner',
      location: 'Pune, India',
      type: 'Full-time',
      experience: '0-2 Years',
      description: 'Responsible for data cleansing, automated Excel/Power BI reporting, SQL querying, and communicating actionable insights.',
      skills_required: ['SQL', 'Power BI', 'Excel', 'Python'],
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  const internships: Internship[] = [
    {
      id: '44444444-4444-4444-4444-444444444401',
      title: 'Data Analytics & BI Intern',
      job_role_id: '11111111-1111-1111-1111-111111111101',
      department: 'Analytics Lab',
      location: 'Baner, Pune',
      duration: '3-6 Months',
      description: 'Hands-on live industry projects analyzing consumer trends, building Power BI executive dashboards, and executing SQL queries.',
      skills_required: ['Excel', 'SQL', 'Power BI'],
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  return {
    profiles: [defaultAdmin],
    job_roles: roles,
    role_keywords: keywords,
    candidates: [],
    applications: [],
    resume_keyword_matches: [],
    leads: [],
    jobs,
    internships,
    testimonials,
    media_library: []
  };
}

function readLocalDb(): LocalDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    try { fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8'); } catch {}
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data: LocalDatabase = JSON.parse(raw);
    if (!data.applications) data.applications = [];
    return data;
  } catch (err) {
    const initial = getInitialData();
    try { fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8'); } catch {}
    return initial;
  }
}

function writeLocalDb(data: LocalDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('[DB] Local DB write warning (non-fatal in serverless):', err);
  }
}

// -------------------------------------------------------------
// UNIFIED DATABASE API
// -------------------------------------------------------------
export const db = {
  isSupabaseConnected(): boolean {
    return isSupabaseConfigured() && getSupabase() !== null;
  },

  // --- PROFILES / AUTH ---
  async getProfileByEmail(email: string): Promise<Profile | null> {
    const cleanEmail = email.toLowerCase().trim();
    const defaultEmail = (getEnv('DEFAULT_ADMIN_EMAIL') || 'admin@knowletive.com').toLowerCase().trim();
    const client = getSupabase();

    if (client) {
      const { data } = await client.from('profiles').select('*').ilike('email', cleanEmail).limit(1);
      if (data && data[0]) {
        const prof = { ...data[0] } as Profile;
        // If password_hash is missing in table, attach default admin hash if it's the admin
        if (!prof.password_hash && prof.email.toLowerCase().trim() === defaultEmail) {
          prof.password_hash = hashPassword(getEnv('DEFAULT_ADMIN_PASSWORD') || '');
        }
        return prof;
      }
    }

    const local = readLocalDb();
    const localProf = local.profiles.find(p => p.email.toLowerCase() === cleanEmail) || null;
    if (localProf) return localProf;

    // Auto-seed default admin if matches
    if (cleanEmail === defaultEmail) {
      const defaultAdmin: Profile = {
        id: '00000000-0000-0000-0000-000000000001',
        email: getEnv('DEFAULT_ADMIN_EMAIL') || 'admin@knowletive.com',
        full_name: 'Knowletive Administrator',
        role: 'admin',
        password_hash: hashPassword(getEnv('DEFAULT_ADMIN_PASSWORD') || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (client) {
        try { await safeUpsert('profiles', defaultAdmin); } catch {}
      }
      return defaultAdmin;
    }

    return null;
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const defaultEmail = (getEnv('DEFAULT_ADMIN_EMAIL') || 'admin@knowletive.com').toLowerCase().trim();
    const client = getSupabase();

    if (client) {
      const { data } = await client.from('profiles').select('*').eq('id', id).single();
      if (data) {
        const prof = { ...data } as Profile;
        if (!prof.password_hash && prof.email.toLowerCase().trim() === defaultEmail) {
          prof.password_hash = hashPassword(getEnv('DEFAULT_ADMIN_PASSWORD') || '');
        }
        return prof;
      }
    }
    const local = readLocalDb();
    return local.profiles.find(p => p.id === id) || null;
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    const local = readLocalDb();
    const idx = local.profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) local.profiles[idx] = profile;
    else local.profiles.push(profile);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      await safeUpsert('profiles', profile);
    }
    return profile;
  },

  // --- JOB ROLES ---
  async getJobRoles(activeOnly = true): Promise<JobRole[]> {
    const client = getSupabase();
    if (client) {
      let q = client.from('job_roles').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('role_name');
      if (data && data.length > 0) return data;
    }
    const local = readLocalDb();
    let res = local.job_roles;
    if (activeOnly) res = res.filter(r => r.is_active);
    return res.sort((a, b) => a.role_name.localeCompare(b.role_name));
  },

  async getJobRoleById(id: string): Promise<JobRole | null> {
    const client = getSupabase();
    if (client) {
      const { data } = await client.from('job_roles').select('*').eq('id', id).single();
      if (data) return data;
    }
    const local = readLocalDb();
    return local.job_roles.find(r => r.id === id) || null;
  },

  async saveJobRole(role: JobRole): Promise<JobRole> {
    role.updated_at = new Date().toISOString();
    const local = readLocalDb();
    const idx = local.job_roles.findIndex(r => r.id === role.id);
    if (idx >= 0) local.job_roles[idx] = role;
    else local.job_roles.push(role);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      await safeUpsert('job_roles', role);
    }
    return role;
  },

  async deleteJobRole(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      await client.from('job_roles').delete().eq('id', id);
    }
    const local = readLocalDb();
    local.job_roles = local.job_roles.filter(r => r.id !== id);
    local.role_keywords = local.role_keywords.filter(k => k.job_role_id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- ROLE KEYWORDS ---
  async getKeywordsByRole(roleId: string, activeOnly = true): Promise<RoleKeyword[]> {
    const client = getSupabase();
    if (client) {
      let q = client.from('role_keywords').select('*').eq('job_role_id', roleId);
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('weight', { ascending: false });
      if (data) return data;
    }
    const local = readLocalDb();
    let res = local.role_keywords.filter(k => k.job_role_id === roleId);
    if (activeOnly) res = res.filter(k => k.is_active);
    return res.sort((a, b) => b.weight - a.weight);
  },

  async getAllKeywords(activeOnly = true): Promise<RoleKeyword[]> {
    const client = getSupabase();
    if (client) {
      let q = client.from('role_keywords').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q;
      if (data) return data;
    }
    const local = readLocalDb();
    let res = local.role_keywords;
    if (activeOnly) res = res.filter(k => k.is_active);
    return res;
  },

  async saveRoleKeyword(kw: RoleKeyword): Promise<RoleKeyword> {
    const local = readLocalDb();
    const idx = local.role_keywords.findIndex(k => k.id === kw.id);
    if (idx >= 0) local.role_keywords[idx] = kw;
    else local.role_keywords.push(kw);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      await safeUpsert('role_keywords', kw);
    }
    return kw;
  },

  async deleteRoleKeyword(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      await client.from('role_keywords').delete().eq('id', id);
    }
    const local = readLocalDb();
    local.role_keywords = local.role_keywords.filter(k => k.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- CANDIDATES ---
  async getCandidates(filters?: { roleId?: string; status?: string; search?: string }): Promise<Candidate[]> {
    const client = getSupabase();
    let list: Candidate[] = [];

    if (client) {
      try {
        let q = client.from('candidates').select('*');
        if (filters?.roleId) q = q.eq('assigned_role_id', filters.roleId);
        if (filters?.status) q = q.eq('status', filters.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.warn('[DB] Supabase getCandidates error:', err);
      }
    }

    if (list.length === 0) {
      const local = readLocalDb();
      list = [...local.candidates];
      if (filters?.roleId) list = list.filter(c => c.assigned_role_id === filters.roleId || c.applied_role_id === filters.roleId);
      if (filters?.status) list = list.filter(c => c.status === filters.status);
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c => c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.includes(s));
    }

    return list.sort((a, b) => {
      const aRead = a.is_read !== false;
      const bRead = b.is_read !== false;
      if (aRead !== bRead) return aRead ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getCandidateById(id: string): Promise<Candidate | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client.from('candidates').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.candidates.find(c => c.id === id) || null;
  },

  async markCandidateAsRead(id: string): Promise<Candidate | null> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) return null;
    candidate.is_read = true;
    candidate.viewed_at = new Date().toISOString();
    return await this.saveCandidate(candidate);
  },

  async findCandidateByEmailOrPhone(email?: string, phone?: string): Promise<Candidate | null> {
    const normEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const client = getSupabase();

    if (client) {
      if (normEmail) {
        const { data } = await client.from('candidates').select('*').ilike('email', normEmail).limit(1);
        if (data && data[0]) return data[0];
      }
      if (cleanPhone.length >= 7) {
        const { data } = await client.from('candidates').select('*').ilike('phone', `%${cleanPhone.slice(-10)}%`).limit(1);
        if (data && data[0]) return data[0];
      }
    }

    const local = readLocalDb();
    return local.candidates.find(c => {
      const cEmail = (c.email || '').trim().toLowerCase();
      const cPhone = (c.phone || '').replace(/\D/g, '');
      if (normEmail && cEmail === normEmail) return true;
      if (cleanPhone.length >= 7 && cPhone.length >= 7 && (cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone))) return true;
      return false;
    }) || null;
  },

  async saveCandidate(candidate: Candidate): Promise<Candidate> {
    candidate.updated_at = new Date().toISOString();
    if (candidate.is_read === undefined) {
      candidate.is_read = false;
    }

    // Deduplicate candidate profile by email or phone
    const existing = await this.findCandidateByEmailOrPhone(candidate.email, candidate.phone);
    if (existing && existing.id !== candidate.id) {
      candidate.id = existing.id;
      if (existing.created_at) candidate.created_at = existing.created_at;
    }

    // Local mirror
    const local = readLocalDb();
    const idx = local.candidates.findIndex(c => c.id === candidate.id);
    if (idx >= 0) local.candidates[idx] = candidate;
    else local.candidates.unshift(candidate);
    writeLocalDb(local);

    // Save persistently to Supabase
    if (isSupabaseConfigured()) {
      const saved = await safeUpsert('candidates', candidate);
      return { ...candidate, ...saved };
    }

    return candidate;
  },

  async deleteCandidate(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('candidates').delete().eq('id', id);
        await client.from('applications').delete().eq('candidate_id', id);
        await client.from('resume_keyword_matches').delete().eq('candidate_id', id);
      } catch (err) {
        console.warn('[DB] Supabase deleteCandidate warning:', err);
      }
    }

    const local = readLocalDb();
    local.candidates = local.candidates.filter(c => c.id !== id);
    local.applications = (local.applications || []).filter(a => a.candidate_id !== id);
    local.resume_keyword_matches = local.resume_keyword_matches.filter(m => m.candidate_id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- RESUME KEYWORD MATCHES ---
  async getCandidateMatches(candidateId: string): Promise<ResumeKeywordMatch[]> {
    const client = getSupabase();
    if (client) {
      const { data } = await client.from('resume_keyword_matches').select('*').eq('candidate_id', candidateId);
      if (data && data.length > 0) return data;
    }
    const local = readLocalDb();
    return local.resume_keyword_matches.filter(m => m.candidate_id === candidateId);
  },

  async saveCandidateMatches(matches: ResumeKeywordMatch[]): Promise<void> {
    if (!matches.length) return;
    const local = readLocalDb();
    const cId = matches[0].candidate_id;
    local.resume_keyword_matches = local.resume_keyword_matches.filter(m => m.candidate_id !== cId);
    local.resume_keyword_matches.push(...matches);
    writeLocalDb(local);

    const client = getSupabase();
    if (client) {
      try {
        await client.from('resume_keyword_matches').upsert(matches);
      } catch (err) {
        console.warn('[DB] Supabase saveCandidateMatches warning:', err);
      }
    }
  },

  // --- APPLICATIONS (JOBS & INTERNSHIPS) ---
  async getApplications(filters?: {
    type?: 'job' | 'internship';
    jobId?: string;
    internshipId?: string;
    candidateId?: string;
    status?: string;
    search?: string;
  }): Promise<ApplicationWithCandidate[]> {
    let apps: Application[] = [];
    const client = getSupabase();

    if (client && !knownMissingTables.has('applications')) {
      try {
        let q = client.from('applications').select('*');
        if (filters?.type) q = q.eq('application_type', filters.type);
        if (filters?.jobId) q = q.eq('job_id', filters.jobId);
        if (filters?.internshipId) q = q.eq('internship_id', filters.internshipId);
        if (filters?.candidateId) q = q.eq('candidate_id', filters.candidateId);
        if (filters?.status) q = q.ilike('status', filters.status.trim());
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) {
          apps = data;
        } else if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
          knownMissingTables.add('applications');
        }
      } catch (err) {
        console.warn('[DB] Supabase getApplications error:', err);
      }
    }

    if (apps.length === 0) {
      const local = readLocalDb();
      apps = [...(local.applications || [])];
      if (filters?.type) apps = apps.filter(a => a.application_type === filters.type);
      if (filters?.jobId) apps = apps.filter(a => a.job_id === filters.jobId);
      if (filters?.internshipId) apps = apps.filter(a => a.internship_id === filters.internshipId);
      if (filters?.candidateId) apps = apps.filter(a => a.candidate_id === filters.candidateId);
      if (filters?.status) {
        const s = filters.status.toLowerCase().trim();
        apps = apps.filter(a => (a.status || '').toLowerCase().trim() === s);
      }
    }

    const [candidates, jobs, internships] = await Promise.all([
      this.getCandidates(),
      this.getJobs(false),
      this.getInternships(false)
    ]);

    const candidateMap = new Map(candidates.map(c => [c.id, c]));
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const internshipMap = new Map(internships.map(i => [i.id, i]));

    let results: ApplicationWithCandidate[] = apps.map(a => ({
      ...a,
      candidate: candidateMap.get(a.candidate_id),
      job: a.job_id ? jobMap.get(a.job_id) : undefined,
      internship: a.internship_id ? internshipMap.get(a.internship_id) : undefined
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(r => {
        const name = (r.candidate?.full_name || '').toLowerCase();
        const email = (r.candidate?.email || '').toLowerCase();
        const phone = (r.candidate?.phone || '').toLowerCase();
        const role = (r.applied_role || '').toLowerCase();
        const jobTitle = (r.job?.title || '').toLowerCase();
        const internTitle = (r.internship?.title || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q) || jobTitle.includes(q) || internTitle.includes(q);
      });
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getApplicationById(id: string): Promise<ApplicationWithCandidate | null> {
    const client = getSupabase();
    let app: Application | null = null;

    if (client && !knownMissingTables.has('applications')) {
      try {
        const { data, error } = await client.from('applications').select('*').eq('id', id).single();
        if (!error && data) app = data;
      } catch {}
    }

    if (!app) {
      const local = readLocalDb();
      app = (local.applications || []).find(a => a.id === id) || null;
    }

    if (!app) return null;

    const [candidate, job, internship] = await Promise.all([
      this.getCandidateById(app.candidate_id),
      app.job_id ? this.getJobById(app.job_id) : Promise.resolve(null),
      app.internship_id ? this.getInternshipById(app.internship_id) : Promise.resolve(null)
    ]);

    return {
      ...app,
      candidate: candidate || undefined,
      job: job || undefined,
      internship: internship || undefined
    };
  },

  async saveApplication(application: Application): Promise<Application> {
    application.updated_at = new Date().toISOString();
    if (!application.created_at) {
      application.created_at = application.updated_at;
    }

    const local = readLocalDb();
    if (!local.applications) local.applications = [];
    const idx = local.applications.findIndex(a => a.id === application.id);
    if (idx >= 0) local.applications[idx] = application;
    else local.applications.unshift(application);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      try {
        await safeUpsert('applications', application);
      } catch (err: any) {
        console.warn('[DB] Supabase saveApplication fallback note:', err.message);
      }
    }

    return application;
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): Promise<Application | null> {
    const now = new Date().toISOString();
    const client = getSupabase();

    if (client && !knownMissingTables.has('applications')) {
      try {
        const updatePayload: Record<string, any> = { status, updated_at: now };
        if (notes !== undefined) updatePayload.admin_notes = notes;
        await client.from('applications').update(updatePayload).eq('id', id);
      } catch (err) {
        console.warn('[DB] Failed to update application in Supabase:', err);
      }
    }

    const local = readLocalDb();
    if (!local.applications) return null;
    const idx = local.applications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    local.applications[idx].status = status;
    local.applications[idx].updated_at = now;
    if (notes !== undefined) {
      local.applications[idx].admin_notes = notes;
    }
    writeLocalDb(local);
    return local.applications[idx];
  },

  async deleteApplication(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client && !knownMissingTables.has('applications')) {
      try {
        await client.from('applications').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Failed to delete application from Supabase:', err);
      }
    }

    const local = readLocalDb();
    if (local.applications) {
      local.applications = local.applications.filter(a => a.id !== id);
      writeLocalDb(local);
    }
    return true;
  },

  // --- LEADS ---
  async getLeads(filters?: { leadType?: string; status?: string; search?: string }): Promise<Lead[]> {
    const client = getSupabase();
    let res: Lead[] = [];

    if (client) {
      try {
        let q = client.from('leads').select('*');
        if (filters?.leadType) q = q.eq('lead_type', filters.leadType);
        if (filters?.status) q = q.eq('status', filters.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) {
          res = data;
        }
      } catch (err) {
        console.warn('[DB] Supabase getLeads error:', err);
      }
    }

    if (res.length === 0) {
      const local = readLocalDb();
      res = [...local.leads];
      if (filters?.leadType) res = res.filter(l => l.lead_type === filters.leadType);
      if (filters?.status) res = res.filter(l => l.status === filters.status);
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      res = res.filter(l => (l.first_name + ' ' + l.last_name).toLowerCase().includes(s) || l.email.toLowerCase().includes(s) || l.phone.includes(s));
    }

    return res.sort((a, b) => {
      const aRead = a.is_read !== false;
      const bRead = b.is_read !== false;
      if (aRead !== bRead) return aRead ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getLeadById(id: string): Promise<Lead | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client.from('leads').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.leads.find(l => l.id === id) || null;
  },

  async markLeadAsRead(id: string): Promise<Lead | null> {
    const lead = await this.getLeadById(id);
    if (!lead) return null;
    lead.is_read = true;
    lead.viewed_at = new Date().toISOString();
    return await this.saveLead(lead);
  },

  async getUnreadCounts(): Promise<{ candidates: number; leads: number }> {
    const client = getSupabase();
    if (client) {
      try {
        const [{ count: cCount, error: cErr }, { count: lCount, error: lErr }] = await Promise.all([
          client.from('candidates').select('*', { count: 'exact', head: true }).eq('is_read', false),
          client.from('leads').select('*', { count: 'exact', head: true }).eq('is_read', false)
        ]);
        if (!cErr && !lErr) {
          return {
            candidates: cCount || 0,
            leads: lCount || 0
          };
        }
      } catch {}
    }

    const local = readLocalDb();
    const candidates = (local.candidates || []).filter(c => c.is_read === false).length;
    const leads = (local.leads || []).filter(l => l.is_read === false).length;
    return { candidates, leads };
  },

  async saveLead(lead: Lead): Promise<Lead> {
    lead.updated_at = new Date().toISOString();
    if (lead.is_read === undefined) {
      lead.is_read = false;
    }

    const local = readLocalDb();
    const idx = local.leads.findIndex(l => l.id === lead.id);
    if (idx >= 0) local.leads[idx] = lead;
    else local.leads.unshift(lead);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      const saved = await safeUpsert('leads', lead);
      return { ...lead, ...saved };
    }

    return lead;
  },

  async deleteLead(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('leads').delete().eq('id', id);
      } catch (err) {
        console.warn('[DB] Supabase deleteLead error:', err);
      }
    }
    const local = readLocalDb();
    local.leads = local.leads.filter(l => l.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- JOBS ---
  async getJobs(activeOnly = true): Promise<Job[]> {
    const client = getSupabase();
    if (client) {
      try {
        let q = client.from('jobs').select('*');
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch {}
    }
    const local = readLocalDb();
    let res = local.jobs;
    if (activeOnly) res = res.filter(j => j.is_active);
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getJobById(id: string): Promise<Job | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data } = await client.from('jobs').select('*').eq('id', id).single();
        if (data) return data;
      } catch {}
    }
    const jobs = await this.getJobs(false);
    return jobs.find(j => j.id === id) || null;
  },

  async saveJob(job: Job): Promise<Job> {
    job.updated_at = new Date().toISOString();
    const local = readLocalDb();
    const idx = local.jobs.findIndex(j => j.id === job.id);
    if (idx >= 0) local.jobs[idx] = job;
    else local.jobs.unshift(job);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      await safeUpsert('jobs', job);
    }
    return job;
  },

  async deleteJob(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try { await client.from('jobs').delete().eq('id', id); } catch {}
    }
    const local = readLocalDb();
    local.jobs = local.jobs.filter(j => j.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- INTERNSHIPS ---
  async getInternships(activeOnly = true): Promise<Internship[]> {
    const client = getSupabase();
    if (client) {
      try {
        let q = client.from('internships').select('*');
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch {}
    }
    const local = readLocalDb();
    let res = local.internships;
    if (activeOnly) res = res.filter(i => i.is_active);
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getInternshipById(id: string): Promise<Internship | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data } = await client.from('internships').select('*').eq('id', id).single();
        if (data) return data;
      } catch {}
    }
    const internships = await this.getInternships(false);
    return internships.find(i => i.id === id) || null;
  },

  async saveInternship(internship: Internship): Promise<Internship> {
    internship.updated_at = new Date().toISOString();
    const local = readLocalDb();
    const idx = local.internships.findIndex(i => i.id === internship.id);
    if (idx >= 0) local.internships[idx] = internship;
    else local.internships.unshift(internship);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      await safeUpsert('internships', internship);
    }
    return internship;
  },

  async deleteInternship(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try { await client.from('internships').delete().eq('id', id); } catch {}
    }
    const local = readLocalDb();
    local.internships = local.internships.filter(i => i.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- TESTIMONIALS ---
  async getTestimonials(publishedOnly = true): Promise<Testimonial[]> {
    const client = getSupabase();
    if (client) {
      try {
        let q = client.from('testimonials').select('*');
        if (publishedOnly) q = q.eq('is_published', true);
        const { data, error } = await q.order('display_order', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch {}
    }
    const local = readLocalDb();
    let res = local.testimonials;
    if (publishedOnly) res = res.filter(t => t.is_published);
    return res.sort((a, b) => a.display_order - b.display_order);
  },

  async getTestimonialById(id: string): Promise<Testimonial | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data } = await client.from('testimonials').select('*').eq('id', id).single();
        if (data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.testimonials.find(t => t.id === id) || null;
  },

  async saveTestimonial(testimonial: Testimonial): Promise<Testimonial> {
    testimonial.updated_at = new Date().toISOString();
    if (testimonial.thumbnail_url && !testimonial.poster_url) {
      testimonial.poster_url = testimonial.thumbnail_url;
    }
    if (testimonial.poster_url && !testimonial.thumbnail_url) {
      testimonial.thumbnail_url = testimonial.poster_url;
    }

    const local = readLocalDb();
    const idx = local.testimonials.findIndex(t => t.id === testimonial.id);
    if (idx >= 0) local.testimonials[idx] = testimonial;
    else local.testimonials.push(testimonial);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      const saved = await safeUpsert('testimonials', testimonial);
      return { ...testimonial, ...saved };
    }
    return testimonial;
  },

  async updateTestimonialThumbnail(id: string, thumbnailUrl: string): Promise<Testimonial | null> {
    const item = await this.getTestimonialById(id);
    if (!item) return null;
    item.poster_url = thumbnailUrl;
    item.thumbnail_url = thumbnailUrl;
    return this.saveTestimonial(item);
  },

  async deleteTestimonial(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try { await client.from('testimonials').delete().eq('id', id); } catch {}
    }
    const local = readLocalDb();
    local.testimonials = local.testimonials.filter(t => t.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- MEDIA LIBRARY ---
  async getMedia(category?: string, publishedOnly: boolean = false): Promise<MediaItem[]> {
    const normalizedCategory = category ? category.toLowerCase().trim() : '';
    const client = getSupabase();

    if (client) {
      try {
        let query = client.from('media_library').select('*');
        if (normalizedCategory) {
          if (normalizedCategory.includes('activit')) {
            query = query.or('category.ilike.%activit%,category.eq.activities,category.eq.Activities Gallery');
          } else {
            query = query.ilike('category', `%${normalizedCategory}%`);
          }
        }
        if (publishedOnly) {
          query = query.eq('is_published', true);
        }
        const { data, error } = await query.order('display_order', { ascending: true }).order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }

    const local = readLocalDb();
    let list = local.media_library || [];

    if (normalizedCategory) {
      list = list.filter(m => {
        const cat = (m.category || 'general').toLowerCase();
        if (normalizedCategory.includes('activit')) {
          return cat.includes('activit');
        }
        return cat.includes(normalizedCategory);
      });
    }

    if (publishedOnly) {
      list = list.filter(m => m.is_published !== false);
    }

    return [...list].sort((a, b) => {
      const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getMediaById(id: string): Promise<MediaItem | null> {
    const client = getSupabase();
    if (client) {
      try {
        const { data } = await client.from('media_library').select('*').eq('id', id).single();
        if (data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return (local.media_library || []).find(m => m.id === id) || null;
  },

  async saveMedia(item: MediaItem): Promise<MediaItem> {
    const local = readLocalDb();
    if (!local.media_library) local.media_library = [];
    local.media_library.unshift(item);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      const saved = await safeUpsert('media_library', item);
      return { ...item, ...saved };
    }
    return item;
  },

  async updateMedia(id: string, updates: Partial<MediaItem>): Promise<MediaItem | null> {
    const now = new Date().toISOString();
    const client = getSupabase();

    if (client) {
      try {
        const { data, error } = await client.from('media_library').update({ ...updates, updated_at: now }).eq('id', id).select().single();
        if (!error && data) return data;
      } catch {}
    }

    const local = readLocalDb();
    if (!local.media_library) return null;
    const idx = local.media_library.findIndex(m => m.id === id);
    if (idx === -1) return null;
    local.media_library[idx] = { ...local.media_library[idx], ...updates, updated_at: now };
    writeLocalDb(local);
    return local.media_library[idx];
  },

  async deleteMedia(id: string): Promise<boolean> {
    const client = getSupabase();
    if (client) {
      try { await client.from('media_library').delete().eq('id', id); } catch {}
    }
    const local = readLocalDb();
    if (local.media_library) {
      local.media_library = local.media_library.filter(m => m.id !== id);
      writeLocalDb(local);
    }
    return true;
  },

  // --- DASHBOARD KPIS ---
  async getDashboardStats() {
    const [candidates, leads, jobs, internships, applications] = await Promise.all([
      this.getCandidates(),
      this.getLeads(),
      this.getJobs(false),
      this.getInternships(false),
      this.getApplications()
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();

    const newResumesToday = candidates.filter(c => {
      const t = new Date(c.created_at).getTime();
      return !isNaN(t) && t >= startOfToday;
    }).length;

    const applicationsThisWeek = candidates.filter(c => {
      const t = new Date(c.created_at).getTime();
      return !isNaN(t) && t >= sevenDaysAgo;
    }).length;

    const norm = (s: string = '') => String(s).toLowerCase().trim();

    const applied = candidates.filter(c => norm(c.status) === 'new' || norm(c.status) === 'applied').length;
    const needsReview = candidates.filter(c => norm(c.status) === 'needs review' || norm(c.status) === 'needs_review').length;
    const shortlisted = candidates.filter(c => norm(c.status) === 'shortlisted').length;
    const selected = candidates.filter(c => norm(c.status) === 'selected').length;
    const interview = candidates.filter(c => norm(c.status) === 'interview').length;
    const rejected = candidates.filter(c => norm(c.status) === 'rejected').length;

    const directJobApps = applications.filter(a => a.application_type === 'job').length;
    const directInternshipApps = applications.filter(a => a.application_type === 'internship').length;

    const courseInquiries = leads.filter(l => norm(l.lead_type) === 'course').length;
    const counselingLeads = leads.filter(l => norm(l.lead_type) === 'counseling').length;
    const admissionLeads = leads.filter(l => norm(l.lead_type) === 'admission').length;
    const jobApplications = directJobApps + leads.filter(l => norm(l.lead_type) === 'job').length;
    const internshipApplications = directInternshipApps + leads.filter(l => norm(l.lead_type) === 'internship').length;
    const ebookLeads = leads.filter(l => norm(l.lead_type) === 'ebook').length;
    const overseasLeads = leads.filter(l => norm(l.lead_type).includes('overseas')).length;
    const contactLeads = leads.filter(l => norm(l.lead_type) === 'contact').length;
    const otherLeads = leads.filter(l => norm(l.lead_type) === 'other').length;

    return {
      totalResumes: candidates.length,
      totalApplications: applications.length,
      directJobApplications: directJobApps,
      directInternshipApplications: directInternshipApps,
      newResumesToday,
      applicationsThisWeek,
      totalLeads: leads.length,
      courseInquiries,
      counselingLeads,
      admissionLeads,
      jobApplications,
      internshipApplications,
      ebookLeads,
      overseasLeads,
      contactLeads,
      otherLeads,
      applied,
      needsReview,
      shortlisted,
      selected,
      interview,
      rejected,
      activeJobs: jobs.filter(j => j.is_active).length,
      activeInternships: internships.filter(i => i.is_active).length
    };
  },

  // --- ANALYTICS ---
  async getAnalyticsSessions(): Promise<AnalyticsSession[]> {
    const client = getSupabase();
    if (client && !knownMissingTables.has('analytics_sessions')) {
      try {
        const { data, error } = await client.from('analytics_sessions').select('*').order('started_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.analytics_sessions || [];
  },

  async getAnalyticsPageviews(): Promise<AnalyticsPageview[]> {
    const client = getSupabase();
    if (client && !knownMissingTables.has('analytics_pageviews')) {
      try {
        const { data, error } = await client.from('analytics_pageviews').select('*').order('started_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.analytics_pageviews || [];
  },

  async getAnalyticsSections(): Promise<AnalyticsSection[]> {
    const client = getSupabase();
    if (client && !knownMissingTables.has('analytics_sections')) {
      try {
        const { data, error } = await client.from('analytics_sections').select('*').order('viewed_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.analytics_sections || [];
  },

  async getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    const client = getSupabase();
    if (client && !knownMissingTables.has('analytics_events')) {
      try {
        const { data, error } = await client.from('analytics_events').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }
    const local = readLocalDb();
    return local.analytics_events || [];
  },

  async saveAnalyticsSession(session: AnalyticsSession): Promise<void> {
    const local = readLocalDb();
    if (!local.analytics_sessions) local.analytics_sessions = [];
    const idx = local.analytics_sessions.findIndex(s => s.session_id === session.session_id);
    if (idx >= 0) local.analytics_sessions[idx] = session;
    else local.analytics_sessions.push(session);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      try { await safeUpsert('analytics_sessions', session); } catch {}
    }
  },

  async saveAnalyticsPageview(pv: AnalyticsPageview): Promise<void> {
    const local = readLocalDb();
    if (!local.analytics_pageviews) local.analytics_pageviews = [];
    const idx = local.analytics_pageviews.findIndex(p => p.id === pv.id);
    if (idx >= 0) {
      local.analytics_pageviews[idx].engaged_seconds = Math.max(local.analytics_pageviews[idx].engaged_seconds, pv.engaged_seconds);
    } else {
      local.analytics_pageviews.push(pv);
    }
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      try { await safeUpsert('analytics_pageviews', pv); } catch {}
    }
  },

  async saveAnalyticsSection(sec: AnalyticsSection): Promise<void> {
    const local = readLocalDb();
    if (!local.analytics_sections) local.analytics_sections = [];
    const idx = local.analytics_sections.findIndex(s => s.id === sec.id);
    if (idx >= 0) {
      local.analytics_sections[idx].engaged_seconds = Math.max(local.analytics_sections[idx].engaged_seconds, sec.engaged_seconds);
    } else {
      local.analytics_sections.push(sec);
    }
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      try { await safeUpsert('analytics_sections', sec); } catch {}
    }
  },

  async saveAnalyticsEvent(evt: AnalyticsEvent): Promise<void> {
    const local = readLocalDb();
    if (!local.analytics_events) local.analytics_events = [];
    local.analytics_events.push(evt);
    writeLocalDb(local);

    if (isSupabaseConfigured()) {
      try { await safeUpsert('analytics_events', evt); } catch {}
    }
  }
};
