-- ============================================================
-- 001_initial_schema.sql
-- Knowletive Database Initial Schema
-- PostgreSQL / Supabase Compatible
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'counselor', 'hr', 'content_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. JOB ROLES
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'Technology',
    description TEXT,
    match_threshold INTEGER NOT NULL DEFAULT 40,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ROLE KEYWORDS
CREATE TABLE IF NOT EXISTS role_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    weight INTEGER NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_role_id, keyword)
);

-- 4. CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    education TEXT,
    degree TEXT,
    specialization TEXT,
    college TEXT,
    graduation_year INTEGER,
    experience_level TEXT,
    current_company TEXT,
    years_experience NUMERIC(4,1),
    preferred_role TEXT,
    applied_role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    assigned_role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    resume_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    resume_file_url TEXT NOT NULL,
    resume_file_name TEXT NOT NULL,
    resume_file_type TEXT NOT NULL,
    resume_file_size BIGINT NOT NULL,
    extracted_text TEXT,
    match_score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Needs Review', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected')),
    source TEXT NOT NULL DEFAULT 'Website Careers',
    admin_notes TEXT,
    privacy_consent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. RESUME KEYWORD MATCHES
CREATE TABLE IF NOT EXISTS resume_keyword_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    matched BOOLEAN NOT NULL DEFAULT FALSE,
    weight INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LEADS
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    lead_type TEXT NOT NULL DEFAULT 'Contact' CHECK (lead_type IN ('Contact', 'Course', 'Counseling', 'Admission', 'Overseas Education', 'Job', 'Internship', 'eBook', 'Other')),
    course_interest TEXT,
    service_interest TEXT,
    admission_interest TEXT,
    counseling_interest TEXT,
    education TEXT,
    degree TEXT,
    college TEXT,
    graduation_year INTEGER,
    courses_completed TEXT,
    current_status TEXT,
    opportunity_type TEXT,
    career_goal TEXT,
    preferred_role TEXT,
    preferred_location TEXT,
    linkedin_url TEXT,
    message TEXT,
    source TEXT NOT NULL DEFAULT 'Website Form',
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Follow-up', 'Interested', 'Converted', 'Not Interested', 'Closed')),
    admin_notes TEXT,
    privacy_consent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Full-time' CHECK (type IN ('Full-time', 'Part-time', 'Internship', 'Contract', 'Remote', 'Hybrid')),
    experience TEXT NOT NULL,
    description TEXT NOT NULL,
    skills_required JSONB NOT NULL DEFAULT '[]'::jsonb,
    deadline DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. INTERNSHIPS
CREATE TABLE IF NOT EXISTS internships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT NOT NULL,
    skills_required JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TESTIMONIALS
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT NOT NULL,
    program TEXT NOT NULL,
    caption TEXT,
    video_url TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. MEDIA LIBRARY
CREATE TABLE IF NOT EXISTS media_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'poster', 'document')),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_match_score ON candidates(match_score);
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_role ON candidates(assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_internships_is_active ON internships(is_active);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_published ON testimonials(is_published, display_order);
