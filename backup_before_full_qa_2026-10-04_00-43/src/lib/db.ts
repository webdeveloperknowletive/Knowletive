// ============================================================
// Knowletive Database Layer
// Supports Supabase PostgreSQL + High-Integrity Local Data Store
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { 
  Profile, JobRole, RoleKeyword, Candidate, Application, ApplicationType, ApplicationStatus, ApplicationWithCandidate, ResumeKeywordMatch, 
  Lead, Job, Internship, Testimonial, MediaItem 
} from './types';
import { hashPassword } from './auth';
import { storage } from './storage';

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
  applications: Application[];
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
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data: LocalDatabase = JSON.parse(raw);
    let mutated = false;

    if (!data.applications) {
      data.applications = [];
      mutated = true;
    }

    // Auto-migrate if existing candidates do not yet have an application entry
    if (data.applications.length === 0 && data.candidates && data.candidates.length > 0) {
      data.applications = data.candidates.map(c => ({
        id: c.id,
        candidate_id: c.id,
        application_type: (c.application_type as ApplicationType) || 'job',
        job_id: c.job_id || null,
        internship_id: c.internship_id || null,
        applied_role: c.applied_role || c.preferred_role || 'General Application',
        status: (c.status as ApplicationStatus) || 'New',
        resume_url: c.resume_file_url,
        resume_file_name: c.resume_file_name,
        resume_file_size: c.resume_file_size,
        match_score: c.match_score,
        matched_keywords: c.resume_keywords,
        skills: c.skills,
        source: c.source || 'Website Careers',
        created_at: c.created_at,
        updated_at: c.updated_at
      }));
      mutated = true;
    }

    if (mutated) {
      writeLocalDb(data);
    }

    return data;
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

  async findCandidateByEmailOrPhone(email?: string, phone?: string): Promise<Candidate | null> {
    const normEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (supabaseClient) {
      if (normEmail) {
        const { data } = await supabaseClient.from('candidates').select('*').ilike('email', normEmail).limit(1);
        if (data && data[0]) return data[0];
      }
      if (cleanPhone.length >= 7) {
        const { data } = await supabaseClient.from('candidates').select('*').ilike('phone', `%${cleanPhone.slice(-10)}%`).limit(1);
        if (data && data[0]) return data[0];
      }
      return null;
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
    // Deduplicate candidate profile: link to existing profile if found by email or phone
    const existing = await this.findCandidateByEmailOrPhone(candidate.email, candidate.phone);
    if (existing && existing.id !== candidate.id) {
      candidate.id = existing.id;
      if (existing.created_at) candidate.created_at = existing.created_at;
    }

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
    local.applications = (local.applications || []).filter(a => a.candidate_id !== id);
    local.resume_keyword_matches = local.resume_keyword_matches.filter(m => m.candidate_id !== id);
    writeLocalDb(local);
    return true;
  },

  // --- CANDIDATE IMPACT & BULK DELETION ---
  async getCandidatesImpactSummary(): Promise<{ candidatesCount: number; resumeFilesCount: number; keywordMatchesCount: number }> {
    let candidatesCount = 0;
    let keywordMatchesCount = 0;
    if (supabaseClient) {
      const [{ count: cCount }, { count: kCount }] = await Promise.all([
        supabaseClient.from('candidates').select('*', { count: 'exact', head: true }),
        supabaseClient.from('resume_keyword_matches').select('*', { count: 'exact', head: true })
      ]);
      candidatesCount = cCount || 0;
      keywordMatchesCount = kCount || 0;
    } else {
      const local = readLocalDb();
      candidatesCount = local.candidates.length;
      keywordMatchesCount = local.resume_keyword_matches.length;
    }
    const resumeFilesCount = await storage.countResumeFiles();
    return {
      candidatesCount,
      resumeFilesCount,
      keywordMatchesCount
    };
  },

  async deleteAllCandidates(adminEmail = 'admin'): Promise<{ candidatesDeleted: number; keywordMatchesDeleted: number; filesDeleted: number }> {
    let candidatesDeleted = 0;
    let keywordMatchesDeleted = 0;

    if (supabaseClient) {
      const [{ count: cCount }, { count: kCount }] = await Promise.all([
        supabaseClient.from('candidates').select('*', { count: 'exact', head: true }),
        supabaseClient.from('resume_keyword_matches').select('*', { count: 'exact', head: true })
      ]);
      candidatesDeleted = cCount || 0;
      keywordMatchesDeleted = kCount || 0;

      // Clean keyword matches first to respect FK constraints
      const { error: matchErr } = await supabaseClient.from('resume_keyword_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (matchErr) throw new Error(`Failed to delete candidate matches: ${matchErr.message}`);

      const { error: candErr } = await supabaseClient.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (candErr) throw new Error(`Failed to delete candidates: ${candErr.message}`);
    } else {
      const local = readLocalDb();
      candidatesDeleted = local.candidates.length;
      keywordMatchesDeleted = local.resume_keyword_matches.length;
      local.candidates = [];
      local.applications = [];
      local.resume_keyword_matches = [];
      writeLocalDb(local);
    }

    // Purge physical resume files to eliminate orphan storage
    const filesDeleted = await storage.deleteAllResumes();

    // Audit Log
    console.log('[AUDIT LOG]', {
      timestamp: new Date().toISOString(),
      adminUser: adminEmail,
      action: 'ADMIN BULK DELETE',
      entity: 'candidates',
      candidates_deleted: candidatesDeleted,
      keyword_matches_deleted: keywordMatchesDeleted,
      resume_files_deleted: filesDeleted
    });

    return {
      candidatesDeleted,
      keywordMatchesDeleted,
      filesDeleted
    };
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

  // --- APPLICATIONS (JOBS & INTERNSHIPS) ---
  async getApplications(filters?: {
    type?: 'job' | 'internship';
    jobId?: string;
    internshipId?: string;
    candidateId?: string;
    status?: string;
    search?: string;
  }): Promise<ApplicationWithCandidate[]> {
    const local = readLocalDb();
    let apps = [...(local.applications || [])];

    if (filters?.type) {
      apps = apps.filter(a => a.application_type === filters.type);
    }
    if (filters?.jobId) {
      apps = apps.filter(a => a.job_id === filters.jobId);
    }
    if (filters?.internshipId) {
      apps = apps.filter(a => a.internship_id === filters.internshipId);
    }
    if (filters?.candidateId) {
      apps = apps.filter(a => a.candidate_id === filters.candidateId);
    }
    if (filters?.status) {
      const s = filters.status.toLowerCase().trim();
      apps = apps.filter(a => (a.status || '').toLowerCase().trim() === s);
    }

    const candidateMap = new Map((local.candidates || []).map(c => [c.id, c]));
    const jobMap = new Map((local.jobs || []).map(j => [j.id, j]));
    const internshipMap = new Map((local.internships || []).map(i => [i.id, i]));

    let results: ApplicationWithCandidate[] = apps.map(a => {
      const candidate = candidateMap.get(a.candidate_id);
      const job = a.job_id ? jobMap.get(a.job_id) : undefined;
      const internship = a.internship_id ? internshipMap.get(a.internship_id) : undefined;
      return {
        ...a,
        candidate,
        job,
        internship
      };
    });

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
    const local = readLocalDb();
    const app = (local.applications || []).find(a => a.id === id);
    if (!app) return null;
    const candidate = (local.candidates || []).find(c => c.id === app.candidate_id);
    const job = app.job_id ? (local.jobs || []).find(j => j.id === app.job_id) : undefined;
    const internship = app.internship_id ? (local.internships || []).find(i => i.id === app.internship_id) : undefined;
    return { ...app, candidate, job, internship };
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
    return application;
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): Promise<Application | null> {
    const local = readLocalDb();
    if (!local.applications) return null;
    const idx = local.applications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    local.applications[idx].status = status;
    local.applications[idx].updated_at = new Date().toISOString();
    if (notes !== undefined) {
      local.applications[idx].admin_notes = notes;
    }
    writeLocalDb(local);
    return local.applications[idx];
  },

  async deleteApplication(id: string): Promise<boolean> {
    const local = readLocalDb();
    if (!local.applications) return true;
    local.applications = local.applications.filter(a => a.id !== id);
    writeLocalDb(local);
    return true;
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

  // --- LEADS IMPACT & BULK DELETION ---
  async getLeadsImpactSummary(): Promise<{ leadsCount: number }> {
    let leadsCount = 0;
    if (supabaseClient) {
      const { count } = await supabaseClient.from('leads').select('*', { count: 'exact', head: true });
      leadsCount = count || 0;
    } else {
      const local = readLocalDb();
      leadsCount = local.leads.length;
    }
    return { leadsCount };
  },

  async deleteAllLeads(adminEmail = 'admin'): Promise<{ leadsDeleted: number }> {
    let leadsDeleted = 0;
    if (supabaseClient) {
      const { count } = await supabaseClient.from('leads').select('*', { count: 'exact', head: true });
      leadsDeleted = count || 0;
      const { error } = await supabaseClient.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(`Failed to delete leads: ${error.message}`);
    } else {
      const local = readLocalDb();
      leadsDeleted = local.leads.length;
      local.leads = [];
      writeLocalDb(local);
    }

    // Audit Log
    console.log('[AUDIT LOG]', {
      timestamp: new Date().toISOString(),
      adminUser: adminEmail,
      action: 'ADMIN BULK DELETE',
      entity: 'leads',
      leads_deleted: leadsDeleted
    });

    return { leadsDeleted };
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

  async getTestimonialById(id: string): Promise<Testimonial | null> {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('testimonials').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return local.testimonials.find(t => t.id === id) || null;
  },

  async saveTestimonial(testimonial: Testimonial): Promise<Testimonial> {
    testimonial.updated_at = new Date().toISOString();
    // Keep poster_url and thumbnail_url mutually aligned per record
    if (testimonial.thumbnail_url && !testimonial.poster_url) {
      testimonial.poster_url = testimonial.thumbnail_url;
    }
    if (testimonial.poster_url && !testimonial.thumbnail_url) {
      testimonial.thumbnail_url = testimonial.poster_url;
    }

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

  async updateTestimonialThumbnail(id: string, thumbnailUrl: string): Promise<Testimonial | null> {
    const item = await this.getTestimonialById(id);
    if (!item) return null;
    item.poster_url = thumbnailUrl;
    item.thumbnail_url = thumbnailUrl;
    return this.saveTestimonial(item);
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
  async getMedia(category?: string, publishedOnly: boolean = false): Promise<MediaItem[]> {
    const normalizedCategory = category ? category.toLowerCase().trim() : '';

    if (supabaseClient) {
      let query = supabaseClient.from('media_library').select('*');
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
      const { data } = await query.order('display_order', { ascending: true }).order('created_at', { ascending: false });
      return data || [];
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
    if (supabaseClient) {
      const { data } = await supabaseClient.from('media_library').select('*').eq('id', id).single();
      return data || null;
    }
    const local = readLocalDb();
    return (local.media_library || []).find(m => m.id === id) || null;
  },

  async saveMedia(item: MediaItem): Promise<MediaItem> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('media_library').upsert(item).select().single();
      if (error) throw error;
      return data;
    }
    const local = readLocalDb();
    if (!local.media_library) local.media_library = [];
    local.media_library.unshift(item);
    writeLocalDb(local);
    return item;
  },

  async updateMedia(id: string, updates: Partial<MediaItem>): Promise<MediaItem | null> {
    const now = new Date().toISOString();
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('media_library').update({ ...updates, updated_at: now }).eq('id', id).select().single();
      if (error) throw error;
      return data;
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
    let deletedItem: MediaItem | undefined;
    if (supabaseClient) {
      const { error } = await supabaseClient.from('media_library').delete().eq('id', id);
      return !error;
    }
    const local = readLocalDb();
    if (!local.media_library) return true;
    deletedItem = local.media_library.find(m => m.id === id);
    local.media_library = local.media_library.filter(m => m.id !== id);
    writeLocalDb(local);

    // Clean up local disk file if it exists in public/uploads/media
    if (deletedItem && deletedItem.file_url && deletedItem.file_url.startsWith('/uploads/media/')) {
      try {
        const localFilePath = path.resolve('public' + deletedItem.file_url);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (e) {
        console.warn('Could not delete media file from disk:', e);
      }
    }
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

    const local = readLocalDb();
    const apps = local.applications || [];
    const directJobApps = apps.filter(a => a.application_type === 'job').length;
    const directInternshipApps = apps.filter(a => a.application_type === 'internship').length;

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
      totalApplications: apps.length,
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
  }
};
