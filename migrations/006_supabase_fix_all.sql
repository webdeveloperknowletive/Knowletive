-- ============================================================
-- 006_supabase_fix_all.sql
-- Comprehensive Fix Migration for Knowletive PostgreSQL / Supabase
-- Fixes missing columns, tables, RLS policies, and storage buckets
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES: Add password_hash and insert default admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Ensure default admin exists
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@knowletive.com',
  'Knowletive Administrator',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Knowletive Administrator';

-- 2. CANDIDATES: Add missing columns
ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS application_type TEXT DEFAULT 'job',
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internship_id UUID REFERENCES internships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_role TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_unread ON candidates(is_read) WHERE is_read = FALSE;

-- 3. LEADS: Add missing columns
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_leads_unread ON leads(is_read) WHERE is_read = FALSE;

-- 4. TESTIMONIALS: Add missing thumbnail_url
ALTER TABLE testimonials 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 5. MEDIA LIBRARY: Add missing category, display_order, is_published, etc.
ALTER TABLE media_library 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'activities',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_media_category_published ON media_library(category, is_published, display_order);

-- 6. APPLICATIONS: Create dedicated applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_type TEXT NOT NULL CHECK (application_type IN ('job', 'internship')),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  internship_id UUID REFERENCES internships(id) ON DELETE SET NULL,
  applied_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Needs Review', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected')),
  resume_url TEXT NOT NULL,
  resume_file_name TEXT,
  resume_file_size BIGINT,
  match_score INTEGER DEFAULT 0,
  matched_keywords JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'Website Careers',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

-- 7. ANALYTICS TABLES: Create tracking tables
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engaged_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  section_id TEXT NOT NULL,
  engaged_seconds INTEGER NOT NULL DEFAULT 0,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_session_id ON analytics_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sections_session_id ON analytics_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- 8. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper function: Is user admin?
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Applications RLS:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Public can insert applications') THEN
    CREATE POLICY "Public can insert applications" ON applications FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Admins full access to applications') THEN
    CREATE POLICY "Admins full access to applications" ON applications FOR ALL USING (is_admin());
  END IF;
END $$;

-- Analytics RLS (Public can insert/upsert, admins can read):
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sessions' AND policyname = 'Public can insert analytics sessions') THEN
    CREATE POLICY "Public can insert analytics sessions" ON analytics_sessions FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sessions' AND policyname = 'Public can update own analytics sessions') THEN
    CREATE POLICY "Public can update own analytics sessions" ON analytics_sessions FOR UPDATE USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sessions' AND policyname = 'Admins full access to analytics sessions') THEN
    CREATE POLICY "Admins full access to analytics sessions" ON analytics_sessions FOR ALL USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_pageviews' AND policyname = 'Public can insert analytics pageviews') THEN
    CREATE POLICY "Public can insert analytics pageviews" ON analytics_pageviews FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_pageviews' AND policyname = 'Public can update analytics pageviews') THEN
    CREATE POLICY "Public can update analytics pageviews" ON analytics_pageviews FOR UPDATE USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_pageviews' AND policyname = 'Admins full access to analytics pageviews') THEN
    CREATE POLICY "Admins full access to analytics pageviews" ON analytics_pageviews FOR ALL USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sections' AND policyname = 'Public can insert analytics sections') THEN
    CREATE POLICY "Public can insert analytics sections" ON analytics_sections FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sections' AND policyname = 'Public can update analytics sections') THEN
    CREATE POLICY "Public can update analytics sections" ON analytics_sections FOR UPDATE USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_sections' AND policyname = 'Admins full access to analytics sections') THEN
    CREATE POLICY "Admins full access to analytics sections" ON analytics_sections FOR ALL USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Public can insert analytics events') THEN
    CREATE POLICY "Public can insert analytics events" ON analytics_events FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Admins full access to analytics events') THEN
    CREATE POLICY "Admins full access to analytics events" ON analytics_events FOR ALL USING (is_admin());
  END IF;
END $$;

-- 9. STORAGE BUCKET CONFIGURATION
-- Ensure 'media' public bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE,
  52428800, -- 50MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 52428800;

-- Storage RLS: Public can read media bucket objects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read media bucket objects') THEN
    CREATE POLICY "Public can read media bucket objects" ON storage.objects
      FOR SELECT USING (bucket_id = 'media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Admins and service can upload media') THEN
    CREATE POLICY "Admins and service can upload media" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'media');
  END IF;
END $$;
