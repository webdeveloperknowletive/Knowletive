-- ============================================================
-- 003_rls_policies.sql
-- Row Level Security (RLS) Policies & Storage Configuration
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_keyword_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

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

-- 1. PROFILES POLICIES
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles" ON profiles
    FOR ALL USING (is_admin());

-- 2. JOB ROLES & KEYWORDS (Public can read active, Admins can manage all)
CREATE POLICY "Public can view active job roles" ON job_roles
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins full access to job roles" ON job_roles
    FOR ALL USING (is_admin());

CREATE POLICY "Public can view active keywords" ON role_keywords
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins full access to role keywords" ON role_keywords
    FOR ALL USING (is_admin());

-- 3. CANDIDATES & RESUME MATCHES (Public can INSERT only; Admins can view/update/delete)
CREATE POLICY "Public can submit resume application" ON candidates
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to candidates" ON candidates
    FOR ALL USING (is_admin());

CREATE POLICY "Public can insert keyword matches upon submit" ON resume_keyword_matches
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to resume keyword matches" ON resume_keyword_matches
    FOR ALL USING (is_admin());

-- 4. LEADS (Public can submit; Admins can view/update/delete)
CREATE POLICY "Public can insert leads" ON leads
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to leads" ON leads
    FOR ALL USING (is_admin());

-- 5. JOBS & INTERNSHIPS (Public can view active; Admins can manage all)
CREATE POLICY "Public can view active jobs" ON jobs
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins have full access to jobs" ON jobs
    FOR ALL USING (is_admin());

CREATE POLICY "Public can view active internships" ON internships
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins have full access to internships" ON internships
    FOR ALL USING (is_admin());

-- 6. TESTIMONIALS (Public can view published; Admins can manage all)
CREATE POLICY "Public can view published testimonials" ON testimonials
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins have full access to testimonials" ON testimonials
    FOR ALL USING (is_admin());

-- 7. MEDIA LIBRARY (Only Admins can manage)
CREATE POLICY "Admins have full access to media library" ON media_library
    FOR ALL USING (is_admin());

-- 8. STORAGE BUCKET CONFIGURATION FOR RESUMES
-- Create private bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-resumes', 
  'candidate-resumes', 
  FALSE, 
  20971520, -- 20MB in bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET 
  public = FALSE, 
  file_size_limit = 20971520;

-- Storage RLS: Public can upload into candidate-resumes; Only admins can read/download
CREATE POLICY "Public can upload resume" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'candidate-resumes');

CREATE POLICY "Admins can view and download resumes" ON storage.objects
    FOR SELECT USING (bucket_id = 'candidate-resumes' AND is_admin());
