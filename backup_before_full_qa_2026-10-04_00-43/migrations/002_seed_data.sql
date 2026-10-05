-- ============================================================
-- 002_seed_data.sql
-- Seed default job roles, keywords, testimonials, and positions
-- ============================================================

-- 1. Insert Default Job Roles
INSERT INTO job_roles (id, role_name, slug, category, description, match_threshold) VALUES
('11111111-1111-1111-1111-111111111101', 'Data Analyst', 'data-analyst', 'Data & Analytics', 'Extracts, processes, and analyzes data using statistical tools and SQL/PowerBI to support decision making.', 40),
('11111111-1111-1111-1111-111111111102', 'Data Scientist', 'data-scientist', 'AI & Machine Learning', 'Develops ML and statistical models using Python, predictive modeling, and deep learning architectures.', 40),
('11111111-1111-1111-1111-111111111103', 'MERN Developer', 'mern-developer', 'Software Engineering', 'Builds scalable full stack web applications using MongoDB, Express, React, and Node.js.', 40),
('11111111-1111-1111-1111-111111111104', 'Java Full Stack', 'java-full-stack', 'Software Engineering', 'Develops enterprise solutions using Java, Spring Boot, Hibernate, microservices, and modern frontend.', 40),
('11111111-1111-1111-1111-111111111105', 'Cloud / DevOps', 'cloud-devops', 'Cloud & Infrastructure', 'Designs CI/CD pipelines, container orchestration, and cloud infrastructure on AWS/Azure/GCP.', 40),
('11111111-1111-1111-1111-111111111106', 'Digital Marketing', 'digital-marketing', 'Growth & Marketing', 'Specializes in SEO, performance marketing, Meta/Google ads, analytics, and content generation.', 40),
('11111111-1111-1111-1111-111111111107', 'Banking & Finance', 'banking', 'Banking & Operations', 'Banking operations, financial analysis, compliance, retail lending, and credit assessments.', 35),
('11111111-1111-1111-1111-111111111108', 'Python Developer', 'python-developer', 'Software Engineering', 'Backend engineering, automated pipelines, REST APIs, and scripts using Python.', 40),
('11111111-1111-1111-1111-111111111109', 'Business Development', 'business-development', 'Sales & Operations', 'Client acquisition, strategic outreach, lead qualification, and revenue generation.', 35),
('11111111-1111-1111-1111-111111111110', 'Counselor', 'counselor', 'Education', 'Student academic counseling, admission guidance, and career trajectory planning.', 35)
ON CONFLICT (role_name) DO NOTHING;

-- 2. Insert Keywords with Weights
-- Data Analyst
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111101', 'sql', 5),
('11111111-1111-1111-1111-111111111101', 'power bi', 5),
('11111111-1111-1111-1111-111111111101', 'powerbi', 5),
('11111111-1111-1111-1111-111111111101', 'excel', 4),
('11111111-1111-1111-1111-111111111101', 'advanced excel', 4),
('11111111-1111-1111-1111-111111111101', 'tableau', 4),
('11111111-1111-1111-1111-111111111101', 'python', 3),
('11111111-1111-1111-1111-111111111101', 'pandas', 3),
('11111111-1111-1111-1111-111111111101', 'numpy', 3),
('11111111-1111-1111-1111-111111111101', 'dashboard', 3),
('11111111-1111-1111-1111-111111111101', 'eda', 3),
('11111111-1111-1111-1111-111111111101', 'data cleaning', 3),
('11111111-1111-1111-1111-111111111101', 'statistics', 3),
('11111111-1111-1111-1111-111111111101', 'mis', 2),
('11111111-1111-1111-1111-111111111101', 'reporting', 2),
('11111111-1111-1111-1111-111111111101', 'data analysis', 4)
ON CONFLICT DO NOTHING;

-- Data Scientist
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111102', 'machine learning', 5),
('11111111-1111-1111-1111-111111111102', 'deep learning', 5),
('11111111-1111-1111-1111-111111111102', 'python', 4),
('11111111-1111-1111-1111-111111111102', 'tensorflow', 4),
('11111111-1111-1111-1111-111111111102', 'pytorch', 4),
('11111111-1111-1111-1111-111111111102', 'scikit-learn', 4),
('11111111-1111-1111-1111-111111111102', 'nlp', 4),
('11111111-1111-1111-1111-111111111102', 'genai', 4),
('11111111-1111-1111-1111-111111111102', 'mlops', 3),
('11111111-1111-1111-1111-111111111102', 'pandas', 3),
('11111111-1111-1111-1111-111111111102', 'numpy', 3),
('11111111-1111-1111-1111-111111111102', 'statistics', 3)
ON CONFLICT DO NOTHING;

-- MERN Developer
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111103', 'react', 5),
('11111111-1111-1111-1111-111111111103', 'node', 5),
('11111111-1111-1111-1111-111111111103', 'express', 4),
('11111111-1111-1111-1111-111111111103', 'mongodb', 4),
('11111111-1111-1111-1111-111111111103', 'javascript', 4),
('11111111-1111-1111-1111-111111111103', 'typescript', 3),
('11111111-1111-1111-1111-111111111103', 'rest api', 3),
('11111111-1111-1111-1111-111111111103', 'redux', 3),
('11111111-1111-1111-1111-111111111103', 'html', 2),
('11111111-1111-1111-1111-111111111103', 'css', 2),
('11111111-1111-1111-1111-111111111103', 'tailwind', 2)
ON CONFLICT DO NOTHING;

-- Java Full Stack
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111104', 'java', 5),
('11111111-1111-1111-1111-111111111104', 'spring boot', 5),
('11111111-1111-1111-1111-111111111104', 'spring', 4),
('11111111-1111-1111-1111-111111111104', 'hibernate', 4),
('11111111-1111-1111-1111-111111111104', 'microservices', 4),
('11111111-1111-1111-1111-111111111104', 'jpa', 3),
('11111111-1111-1111-1111-111111111104', 'mysql', 3),
('11111111-1111-1111-1111-111111111104', 'react', 3),
('11111111-1111-1111-1111-111111111104', 'rest api', 3)
ON CONFLICT DO NOTHING;

-- Cloud / DevOps
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111105', 'aws', 5),
('11111111-1111-1111-1111-111111111105', 'docker', 5),
('11111111-1111-1111-1111-111111111105', 'kubernetes', 5),
('11111111-1111-1111-1111-111111111105', 'ci/cd', 4),
('11111111-1111-1111-1111-111111111105', 'jenkins', 4),
('11111111-1111-1111-1111-111111111105', 'terraform', 4),
('11111111-1111-1111-1111-111111111105', 'linux', 4),
('11111111-1111-1111-1111-111111111105', 'azure', 4),
('11111111-1111-1111-1111-111111111105', 'git', 3),
('11111111-1111-1111-1111-111111111105', 'monitoring', 3)
ON CONFLICT DO NOTHING;

-- Digital Marketing
INSERT INTO role_keywords (job_role_id, keyword, weight) VALUES
('11111111-1111-1111-1111-111111111106', 'seo', 5),
('11111111-1111-1111-1111-111111111106', 'google ads', 5),
('11111111-1111-1111-1111-111111111106', 'meta ads', 5),
('11111111-1111-1111-1111-111111111106', 'sem', 4),
('11111111-1111-1111-1111-111111111106', 'social media', 4),
('11111111-1111-1111-1111-111111111106', 'analytics', 4),
('11111111-1111-1111-1111-111111111106', 'lead generation', 4),
('11111111-1111-1111-1111-111111111106', 'content marketing', 3)
ON CONFLICT DO NOTHING;

-- 3. Seed Default Testimonials (Mapping current site videos)
INSERT INTO testimonials (id, student_name, program, caption, video_url, poster_url, display_order, is_published) VALUES
('22222222-2222-2222-2222-222222222201', 'Priya Sharma', 'Data Science & AI/ML', 'Secured an offer as Associate Data Scientist after hands-on project portfolio coaching.', '/videos/testimonials/session-review-final.mp4', '/videos/testimonials/posters/priya-sharma.jpg', 1, TRUE),
('22222222-2222-2222-2222-222222222202', 'Rahul Mehta', 'PEP Program', 'The Professional Employability Program transformed my corporate readiness and interview skills.', '/videos/testimonials/shrushti-review.mp4', '/videos/testimonials/posters/rahul-mehta.jpg', 2, TRUE),
('22222222-2222-2222-2222-222222222203', 'Sneha Desai', 'Data Analyst', 'Mastered Power BI and SQL dashboards. Cleared MNC technical rounds in the 1st attempt.', '/videos/testimonials/certificate-reel.mp4', '/videos/testimonials/posters/sneha-desai.jpg', 3, TRUE),
('22222222-2222-2222-2222-222222222204', 'Vikram Patil', 'Business Consulting', 'Incredible guidance on business strategy, case interview prep, and corporate communication.', '/videos/testimonials/syllabus-review.mp4', '/videos/testimonials/posters/vikram-patil.jpg', 4, TRUE)
ON CONFLICT DO NOTHING;

-- 4. Seed Active Jobs and Internships
INSERT INTO jobs (id, title, job_role_id, company, location, type, experience, description, skills_required, is_active) VALUES
('33333333-3333-3333-3333-333333333301', 'Junior Data Analyst', '11111111-1111-1111-1111-111111111101', 'Knowletive Placement Partner', 'Pune, India', 'Full-time', '0-2 Years', 'Responsible for data cleansing, automated Excel/Power BI reporting, SQL querying, and communicating actionable insights to department leaders.', '["SQL", "Power BI", "Excel", "Python"]'::jsonb, TRUE),
('33333333-3333-3333-3333-333333333302', 'Associate MERN Stack Developer', '11111111-1111-1111-1111-111111111103', 'Tech Partner Solutions', 'Pune / Remote', 'Full-time', '0-1 Years', 'Develop modern client applications with React and Node.js REST services. Participate in sprint planning and code reviews.', '["React", "Node.js", "Express", "MongoDB", "JavaScript"]'::jsonb, TRUE),
('33333333-3333-3333-3333-333333333303', 'Cloud & DevOps Trainee Engineer', '11111111-1111-1111-1111-111111111105', 'Global Cloud Infotech', 'Pune / Hybrid', 'Full-time', 'Fresher', 'Work alongside senior DevOps architects to manage AWS environments, deploy Dockerized containers, and maintain CI/CD pipelines.', '["AWS", "Linux", "Docker", "Git", "CI/CD"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO internships (id, title, job_role_id, department, location, duration, description, skills_required, is_active) VALUES
('44444444-4444-4444-4444-444444444401', 'Data Analytics & BI Intern', '11111111-1111-1111-1111-111111111101', 'Analytics Lab', 'Baner, Pune', '3-6 Months', 'Hands-on live industry projects analyzing consumer trends, building Power BI executive dashboards, and executing SQL extraction queries.', '["Excel", "SQL", "Power BI"]'::jsonb, TRUE),
('44444444-4444-4444-4444-444444444402', 'Full Stack Web Development Intern', '11111111-1111-1111-1111-111111111103', 'Software Engineering', 'Baner, Pune', '3-6 Months', 'Build UI modules with React & Tailwind, write backend REST APIs with Express & MongoDB, and gain live deployment experience.', '["HTML/CSS", "JavaScript", "React", "Node.js"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;
