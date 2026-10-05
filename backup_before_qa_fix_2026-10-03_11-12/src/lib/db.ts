// ============================================================
// Knowletive Database Layer
// Supports Supabase PostgreSQL + High-Integrity Local Data Store
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { 
  Profile, JobRole, RoleKeyword, Candidate, ResumeKeywordMatch, 
  Lead, Job, Internship, Testimonial, MediaItem 
} from './types';
import { hashPassword } from './auth';

const DATA_DIR = path.resolve('.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Supabase environment check
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id'));

let supabaseClient: SupabaseClient | null = null;
if (useSupabase) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DB] Connected to Supabase:', SUPABASE_URL);
  } catch (err) {
    console.warn('[DB] Supabase initialization failed, falling back to local store:', err);
  }
}

// -------------------------------------------------------------
// LOCAL DATA STORE INTERFACE (For Local Dev & Fallback)
// -------------------------------------------------------------
interface LocalDatabase {
  profiles: Profile[];
  job_roles: JobRole[];
  role_keywords: RoleKeyword[];
  candidates: Candidate[];
  resume_keyword_matches: ResumeKeywordMatch[];
  leads: Lead[];
  jobs: Job[];
  internships: Internship[];
  testimonials: Testimonial[];
  media_library: MediaItem[];
}

function getInitialData(): LocalDatabase {
  const now = new Date().toISOString();
  
  // Default Admin profile
  const adminId = '00000000-0000-0000-0000-000000000001';
  const defaultAdmin: Profile = {
    id: adminId,
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@knowletive.com',
    full_name: 'Knowletive Administrator',
    role: 'admin',
    password_hash: hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'KnowletiveAdmin2026!'),
    created_at: now,
    updated_at: now
  };

  // Default Job Roles
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
    },
    {
      id: '11111111-1111-1111-1111-111111111106',
      role_name: 'Digital Marketing',
      slug: 'digital-marketing',
      category: 'Growth & Marketing',
      description: 'Specializes in SEO, performance marketing, Meta/Google ads, analytics, and content generation.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111107',
      role_name: 'Banking & Finance',
      slug: 'banking',
      category: 'Banking & Operations',
      description: 'Banking operations, financial analysis, compliance, retail lending, and credit assessments.',
      match_threshold: 35,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '11111111-1111-1111-1111-111111111108',
      role_name: 'Python Developer',
      slug: 'python-developer',
      category: 'Software Engineering',
      description: 'Backend engineering, automated pipelines, REST APIs, and scripts using Python.',
      match_threshold: 40,
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  // Default Keywords with weights
  const keywords: RoleKeyword[] = [
    // Data Analyst
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'sql', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'power bi', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'powerbi', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'excel', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'advanced excel', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'tableau', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'python', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'pandas', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'numpy', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'dashboard', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'eda', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'data cleaning', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'statistics', weight: 3, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111101', keyword: 'data analysis', weight: 4, is_active: true, created_at: now },

    // Data Scientist
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'machine learning', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'deep learning', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'python', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'tensorflow', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'pytorch', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'scikit-learn', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'nlp', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111102', keyword: 'pandas', weight: 3, is_active: true, created_at: now },

    // MERN Developer
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'react', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'node', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'express', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'mongodb', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'javascript', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111103', keyword: 'rest api', weight: 3, is_active: true, created_at: now },

    // Java Full Stack
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111104', keyword: 'java', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111104', keyword: 'spring boot', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111104', keyword: 'microservices', weight: 4, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111104', keyword: 'mysql', weight: 3, is_active: true, created_at: now },

    // Cloud / DevOps
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111105', keyword: 'aws', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111105', keyword: 'docker', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111105', keyword: 'kubernetes', weight: 5, is_active: true, created_at: now },
    { id: crypto.randomUUID(), job_role_id: '11111111-1111-1111-1111-111111111105', keyword: 'ci/cd', weight: 4, is_active: true, created_at: now }
  ];

  // Default Testimonials
  const testimonials: Testimonial[] = [
    {
      id: '22222222-2222-2222-2222-222222222201',
      student_name: 'Priya Sharma',
      program: 'Data Science & AI/ML',
      caption: 'Secured an offer as Associate Data Scientist after hands-on project portfolio coaching.',
      video_url: '/videos/testimonials/session-review-final.mp4',
      poster_url: '/videos/testimonials/posters/priya-sharma.jpg',
      display_order: 1,
      is_published: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      student_name: 'Rahul Mehta',
      program: 'PEP Program',
      caption: 'The Professional Employability Program transformed my corporate readiness and interview skills.',
      video_url: '/videos/testimonials/shrushti-review.mp4',
      poster_url: '/videos/testimonials/posters/rahul-mehta.jpg',
      display_order: 2,
      is_published: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      student_name: 'Sneha Desai',
      program: 'Data Analyst',
      caption: 'Mastered Power BI and SQL dashboards. Cleared MNC technical rounds in the 1st attempt.',
      video_url: '/videos/testimonials/certificate-reel.mp4',
      poster_url: '/videos/testimonials/posters/sneha-desai.jpg',
      display_order: 3,
      is_published: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '22222222-2222-2222-2222-222222222204',
      student_name: 'Vikram Patil',
      program: 'Business Consulting',
      caption: 'Incredible guidance on business strategy, case interview prep, and corporate communication.',
      video_url: '/videos/testimonials/syllabus-review.mp4',
      poster_url: '/videos/testimonials/posters/vikram-patil.jpg',
      display_order: 4,
      is_published: true,
      created_at: now,
      updated_at: now
    }
  ];

  // Default Jobs & Internships
  const jobs: Job[] = [
    {
      id: '33333333-3333-3333-3333-333333333301',
      title: 'Junior Data Analyst',
      job_role_id: '11111111-1111-1111-1111-111111111101',
      company: 'Knowletive Placement Partner',
      location: 'Pune, India',
      type: 'Full-time',
      experience: '0-2 Years',
      description: 'Responsible for data cleansing, automated Excel/Power BI reporting, SQL querying, and communicating actionable insights to department leaders.',
      skills_required: ['SQL', 'Power BI', 'Excel', 'Python'],
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '33333333-3333-3333-3333-333333333302',
      title: 'Associate MERN Stack Developer',
      job_role_id: '11111111-1111-1111-1111-111111111103',
      company: 'Tech Partner Solutions',
      location: 'Pune / Remote',
      type: 'Full-time',
      experience: '0-1 Years',
      description: 'Develop modern client applications with React and Node.js REST services. Participate in sprint planning and code reviews.',
      skills_required: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript'],
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
      description: 'Hands-on live industry projects analyzing consumer trends, building Power BI executive dashboards, and executing SQL extraction queries.',
      skills_required: ['Excel', 'SQL', 'Power BI'],
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: '44444444-4444-4444-4444-444444444402',
      title: 'Full Stack Web Development Intern',
      job_role_id: '11111111-1111-1111-1111-111111111103',
      department: 'Software Engineering',
      location: 'Baner, Pune',
      duration: '3-6 Months',
      description: 'Build UI modules with React & Tailwind, write backend REST APIs with Express & MongoDB, and gain live deployment experience.',
      skills_required: ['HTML/CSS', 'JavaScript', 'React', 'Node.js'],
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
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB] Failed to parse db.json, re-initializing fallback:', err);
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function writeLocalDb(data: LocalDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = DB_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

// -------------------------------------------------------------
// UNIFIED DATABASE API
// -------------------------------------------------------------
export const db = {
  // --- PROFILES / AUTH ---
  async getProfileByEmail(email: string): Promise<Profile | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('profiles').select('*').eq('email', cleanEmail).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.profiles.find(p => p.email.toLowerCase() === cleanEmail) || null;
  },

  async getProfileById(id: string): Promise<Profile | null> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.profiles.find(p => p.id === id) || null;
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('profiles').upsert(profile).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) local.profiles[idx] = profile;
    else local.profiles.push(profile);
    writeLocalDb(local);
    return profile;
  },

  // --- JOB ROLES ---
  async getJobRoles(activeOnly = true): Promise<JobRole[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('job_roles').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('role_name');
      return data || [];
    }
    const local = readLocalDb();
    let res = local.job_roles;
    if (activeOnly) res = res.filter(r => r.is_active);
    return res.sort((a, b) => a.role_name.localeCompare(b.role_name));
  },

  async getJobRoleById(id: string): Promise<JobRole | null> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('job_roles').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.job_roles.find(r => r.id === id) || null;
  },

  async saveJobRole(role: JobRole): Promise<JobRole> {
    role.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('job_roles').upsert(role).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.job_roles.findIndex(r => r.id === role.id);
    if (idx >= 0) local.job_roles[idx] = role;
    else local.job_roles.push(role);
    writeLocalDb(local);
    return role;
  },

  async deleteJobRole(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('job_roles').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.job_roles = local.job_roles.filter(r => r.id !== id);
    local.role_keywords = local.role_keywords.filter(k => k.job_role_id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- ROLE KEYWORDS ---
  async getKeywordsByRole(roleId: string, activeOnly = true): Promise<RoleKeyword[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('role_keywords').select('*').eq('job_role_id', roleId);
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('weight', { ascending: false });
      return data || [];
    }
    const local = readLocalDb();
    let res = local.role_keywords.filter(k => k.job_role_id === roleId);
    if (activeOnly) res = res.filter(k => k.is_active);
    return res.sort((a, b) => b.weight - a.weight);
  },

  async getAllKeywords(activeOnly = true): Promise<RoleKeyword[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('role_keywords').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q;
      return data || [];
    }
    const local = readLocalDb();
    let res = local.role_keywords;
    if (activeOnly) res = res.filter(k => k.is_active);
    return res;
  },

  async saveRoleKeyword(kw: RoleKeyword): Promise<RoleKeyword> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('role_keywords').upsert(kw).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.role_keywords.findIndex(k => k.id === kw.id);
    if (idx >= 0) local.role_keywords[idx] = kw;
    else local.role_keywords.push(kw);
    writeLocalDb(local);
    return kw;
  },

  async deleteRoleKeyword(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('role_keywords').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.role_keywords = local.role_keywords.filter(k => k.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- CANDIDATES ---
  async getCandidates(filters?: { roleId?: string; status?: string; search?: string }): Promise<Candidate[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('candidates').select('*');
      if (filters?.roleId) q = q.eq('assigned_role_id', filters.roleId);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data } = await q.order('created_at', { ascending: false });
      let res = data || [];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        res = res.filter(c => c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.includes(s));
      }
      return res;
    }
    const local = readLocalDb();
    let res = [...local.candidates];
    if (filters?.roleId) res = res.filter(c => c.assigned_role_id === filters.roleId || c.applied_role_id === filters.roleId);
    if (filters?.status) res = res.filter(c => c.status === filters.status);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      res = res.filter(c => c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.includes(s));
    }
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getCandidateById(id: string): Promise<Candidate | null> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('candidates').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.candidates.find(c => c.id === id) || null;
  },

  async saveCandidate(candidate: Candidate): Promise<Candidate> {
    candidate.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('candidates').upsert(candidate).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.candidates.findIndex(c => c.id === candidate.id);
    if (idx >= 0) local.candidates[idx] = candidate;
    else local.candidates.unshift(candidate);
    writeLocalDb(local);
    return candidate;
  },

  async deleteCandidate(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('candidates').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.candidates = local.candidates.filter(c => c.id !== id);
    local.resume_keyword_matches = local.resume_keyword_matches.filter(m => m.candidate_id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- RESUME KEYWORD MATCHES ---
  async getCandidateMatches(candidateId: string): Promise<ResumeKeywordMatch[]> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('resume_keyword_matches').select('*').eq('candidate_id', candidateId);
      return data || [];
    }
    const local = readLocalDb();
    return local.resume_keyword_matches.filter(m => m.candidate_id === candidateId);
  },

  async saveCandidateMatches(matches: ResumeKeywordMatch[]): Promise<void> {
    if (!matches.length) return;
    if (supabaseClient) {
      await supabaseClient.from('resume_keyword_matches').upsert(matches);
      return;
    }
    const local = readLocalDb();
    const cId = matches[0].candidate_id;
    local.resume_keyword_matches = local.resume_keyword_matches.filter(m => m.candidate_id !== cId);
    local.resume_keyword_matches.push(...matches);
    writeLocalDb(local);
  },

  // --- LEADS ---
  async getLeads(filters?: { leadType?: string; status?: string; search?: string }): Promise<Lead[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('leads').select('*');
      if (filters?.leadType) q = q.eq('lead_type', filters.leadType);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data } = await q.order('created_at', { ascending: false });
      let res = data || [];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        res = res.filter(l => l.first_name.toLowerCase().includes(s) || l.last_name.toLowerCase().includes(s) || l.email.toLowerCase().includes(s) || l.phone.includes(s));
      }
      return res;
    }
    const local = readLocalDb();
    let res = [...local.leads];
    if (filters?.leadType) res = res.filter(l => l.lead_type === filters.leadType);
    if (filters?.status) res = res.filter(l => l.status === filters.status);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      res = res.filter(l => (l.first_name + ' ' + l.last_name).toLowerCase().includes(s) || l.email.toLowerCase().includes(s) || l.phone.includes(s));
    }
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getLeadById(id: string): Promise<Lead | null> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('leads').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.leads.find(l => l.id === id) || null;
  },

  async saveLead(lead: Lead): Promise<Lead> {
    lead.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('leads').upsert(lead).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.leads.findIndex(l => l.id === lead.id);
    if (idx >= 0) local.leads[idx] = lead;
    else local.leads.unshift(lead);
    writeLocalDb(local);
    return lead;
  },

  async deleteLead(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('leads').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.leads = local.leads.filter(l => l.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- JOBS ---
  async getJobs(activeOnly = true): Promise<Job[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('jobs').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('created_at', { ascending: false });
      return data || [];
    }
    const local = readLocalDb();
    let res = local.jobs;
    if (activeOnly) res = res.filter(j => j.is_active);
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveJob(job: Job): Promise<Job> {
    job.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('jobs').upsert(job).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.jobs.findIndex(j => j.id === job.id);
    if (idx >= 0) local.jobs[idx] = job;
    else local.jobs.unshift(job);
    writeLocalDb(local);
    return job;
  },

  async deleteJob(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('jobs').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.jobs = local.jobs.filter(j => j.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- INTERNSHIPS ---
  async getInternships(activeOnly = true): Promise<Internship[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('internships').select('*');
      if (activeOnly) q = q.eq('is_active', true);
      const { data } = await q.order('created_at', { ascending: false });
      return data || [];
    }
    const local = readLocalDb();
    let res = local.internships;
    if (activeOnly) res = res.filter(i => i.is_active);
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveInternship(internship: Internship): Promise<Internship> {
    internship.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('internships').upsert(internship).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.internships.findIndex(i => i.id === internship.id);
    if (idx >= 0) local.internships[idx] = internship;
    else local.internships.unshift(internship);
    writeLocalDb(local);
    return internship;
  },

  async deleteInternship(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('internships').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.internships = local.internships.filter(i => i.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- TESTIMONIALS ---
  async getTestimonials(publishedOnly = true): Promise<Testimonial[]> {
    if (supabaseClient) {
      let q = supabaseClient.from('testimonials').select('*');
      if (publishedOnly) q = q.eq('is_published', true);
      const { data } = await q.order('display_order', { ascending: true });
      return data || [];
    }
    const local = readLocalDb();
    let res = local.testimonials;
    if (publishedOnly) res = res.filter(t => t.is_published);
    return res.sort((a, b) => a.display_order - b.display_order);
  },

  async saveTestimonial(testimonial: Testimonial): Promise<Testimonial> {
    testimonial.updated_at = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('testimonials').upsert(testimonial).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    const idx = local.testimonials.findIndex(t => t.id === testimonial.id);
    if (idx >= 0) local.testimonials[idx] = testimonial;
    else local.testimonials.push(testimonial);
    writeLocalDb(local);
    return testimonial;
  },

  async deleteTestimonial(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('testimonials').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.testimonials = local.testimonials.filter(t => t.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- MEDIA LIBRARY ---
  async getMedia(): Promise<MediaItem[]> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('media_library').select('*').order('created_at', { ascending: false });
      return data || [];
    }
    const local = readLocalDb();
    return [...local.media_library].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveMedia(item: MediaItem): Promise<MediaItem> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('media_library').upsert(item).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    local.media_library.unshift(item);
    writeLocalDb(local);
    return item;
  },

  async deleteMedia(id: string): Promise<boolean> {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('media_library').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    local.media_library = local.media_library.filter(m => m.id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- DASHBOARD KPIS ---
  async getDashboardStats() {
    const [candidates, leads, jobs, internships] = await Promise.all([
      this.getCandidates(),
      this.getLeads(),
      this.getJobs(false),
      this.getInternships(false)
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const newResumesToday = candidates.filter(c => c.created_at.startsWith(todayStr)).length;
    const applicationsThisWeek = candidates.filter(c => new Date(c.created_at) >= sevenDaysAgo).length;

    const shortlisted = candidates.filter(c => c.status === 'Shortlisted').length;
    const selected = candidates.filter(c => c.status === 'Selected').length;
    const rejected = candidates.filter(c => c.status === 'Rejected').length;
    const needsReview = candidates.filter(c => c.status === 'Needs Review' || c.status === 'New').length;

    const courseInquiries = leads.filter(l => l.lead_type === 'Course').length;
    const counselingLeads = leads.filter(l => l.lead_type === 'Counseling').length;
    const admissionLeads = leads.filter(l => l.lead_type === 'Admission').length;
    const jobApplications = leads.filter(l => l.lead_type === 'Job').length;
    const internshipApplications = leads.filter(l => l.lead_type === 'Internship').length;
    const ebookLeads = leads.filter(l => l.lead_type === 'eBook').length;

    return {
      totalResumes: candidates.length,
      newResumesToday,
      applicationsThisWeek,
      totalLeads: leads.length,
      courseInquiries,
      counselingLeads,
      admissionLeads,
      jobApplications,
      internshipApplications,
      ebookLeads,
      shortlisted,
      selected,
      rejected,
      needsReview,
      activeJobs: jobs.filter(j => j.is_active).length,
      activeInternships: internships.filter(i => i.is_active).length
    };
  }
};
