// ============================================================
// Knowletive Core TypeScript Definitions & Database Models
// ============================================================

export type UserRole = 'admin' | 'user' | 'counselor' | 'hr' | 'content_manager';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface JobRole {
  id: string;
  role_name: string;
  slug: string;
  category: string;
  description: string;
  match_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleKeyword {
  id: string;
  job_role_id: string;
  keyword: string;
  weight: number;
  is_active: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  education?: string;
  degree?: string;
  specialization?: string;
  college?: string;
  graduation_year?: number;
  experience_level?: string;
  current_company?: string;
  years_experience?: number;
  preferred_role?: string;
  applied_role_id?: string;
  assigned_role_id?: string;
  skills: string[];
  resume_keywords: string[];
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  resume_file_url: string;
  resume_file_name: string;
  resume_file_type: string;
  resume_file_size: number;
  extracted_text?: string;
  match_score: number;
  status: 'New' | 'Needs Review' | 'Shortlisted' | 'Interviewing' | 'Selected' | 'Rejected';
  application_type?: ApplicationType;
  job_id?: string;
  internship_id?: string;
  applied_role?: string;
  source: string;
  admin_notes?: string;
  privacy_consent: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplicationType = 'job' | 'internship';
export type ApplicationStatus = 'New' | 'Needs Review' | 'Shortlisted' | 'Interviewing' | 'Selected' | 'Rejected';

export interface Application {
  id: string;
  candidate_id: string;
  application_type: ApplicationType;
  job_id?: string | null;
  internship_id?: string | null;
  applied_role: string;
  status: ApplicationStatus;
  resume_url: string;
  resume_file_name?: string;
  resume_file_size?: number;
  match_score?: number;
  matched_keywords?: string[];
  skills?: string[];
  source?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithCandidate extends Application {
  candidate?: Candidate;
  job?: Job;
  internship?: Internship;
}

export interface ResumeKeywordMatch {
  id: string;
  candidate_id: string;
  job_role_id: string;
  keyword: string;
  matched: boolean;
  weight: number;
  created_at: string;
}

export type LeadType = 'Contact' | 'Course' | 'Counseling' | 'Admission' | 'Overseas Education' | 'Job' | 'Internship' | 'eBook' | 'Other';
export type LeadStatus = 'New' | 'Contacted' | 'Follow-up' | 'Interested' | 'Converted' | 'Not Interested' | 'Closed';

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_type: LeadType;
  course_interest?: string;
  service_interest?: string;
  admission_interest?: string;
  counseling_interest?: string;
  education?: string;
  degree?: string;
  college?: string;
  graduation_year?: number;
  courses_completed?: string;
  current_status?: string;
  opportunity_type?: string;
  career_goal?: string;
  preferred_role?: string;
  preferred_location?: string;
  linkedin_url?: string;
  message?: string;
  source: string;
  status: LeadStatus;
  admin_notes?: string;
  privacy_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  title: string;
  job_role_id?: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Remote' | 'Hybrid';
  experience: string;
  description: string;
  skills_required: string[];
  deadline?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Internship {
  id: string;
  title: string;
  job_role_id?: string;
  department: string;
  location: string;
  duration: string;
  description: string;
  skills_required: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  student_name: string;
  program: string;
  caption?: string;
  video_url: string;
  poster_url: string;
  thumbnail_url?: string;
  image_url?: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'poster' | 'document';
  media_type?: 'image' | 'video' | 'poster' | 'document';
  title: string;
  description?: string;
  category: 'activities' | 'placements' | 'testimonials' | 'courses' | 'general';
  is_published: boolean;
  display_order?: number;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
  uploaded_by?: string;
}

export interface MatchResult {
  role: JobRole;
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
}
