# BACKUP MANIFEST

- **Backup Date / Time**: 2026-10-03 10:24 IST
- **Backup Directory**: `backup_before_admin_upgrade_2026-10-03_10-24`
- **Original Project Path**: `c:\Users\ayush\Downloads\Knowletiveweb - Copy`
- **Framework Detected**: Astro v7.3.5 (with Tailwind CSS v4, TypeScript, Vite)
- **Git Commit Hash**: `e74b3133bee1ea0c87afcb3ddc6b1d4b2033b21b`
- **Files & Folders Backed Up**:
  - `src/` (all 15 components, BaseLayout, 26 pages, global.css)
  - `public/` (all downloads, images, partner logos, testimonial videos and posters, favicons, robots.txt)
  - `package.json`
  - `package-lock.json`
  - `astro.config.mjs`
  - `tsconfig.json`
  - `.env.example`
  - `.gitignore`
  - `README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
- **Excluded Items**:
  - `node_modules/`
  - `dist/`
  - `.astro/`
  - build caches
  - `.git/`

## Planned Changes
1. **Database & Schema**:
   - Design PostgreSQL / Supabase tables: `profiles`, `job_roles`, `role_keywords`, `candidates`, `resume_keyword_matches`, `leads`, `jobs`, `internships`, `testimonials`, `media_library`.
   - Setup versioned SQL migrations.
2. **Server-Side Architecture & Authentication**:
   - Switch Astro to server/hybrid mode (via `@astrojs/node` adapter or server middleware) so endpoints and `/admin` routes have true server-side protection and cannot be bypassed via frontend-only tampering.
   - Implement Supabase Auth / secure session cookie management and Role-Based Access Control (`role = 'admin'`).
   - Server-side redirect to `/` for any unauthenticated or non-admin user attempting to access `/admin` or `/admin/*`.
3. **Resume Management & Processing**:
   - Add secure resume upload (PDF, DOCX, TXT max 20MB) to Internship & Jobs page and candidate flows.
   - Implement secure bucket storage (`candidate-resumes`) with private signed URLs.
   - Implement text extraction pipeline: PDF parser, DOCX extractor, TXT reader + OCR fallback for scanned PDFs.
   - Candidate detail extraction (Contact info, education, experience, links, skills).
   - Role-based weighted keyword matching engine calculating match percentages.
4. **Enhanced Forms & Leads Persistence**:
   - Connect Contact Form directly to database (`leads` table) with privacy consent.
   - Expand Free eBook Form with comprehensive qualification, career goals, and domain fields. Save to DB before initiating eBook download.
5. **Admin Dashboard (`/admin`)**:
   - Navy/blue/orange professional responsive UI.
   - Metrics/KPIs overview.
   - Resumes/Candidate table & detailed candidate page with keyword matching chips (green/gray), score breakdowns, status workflow, and private resume previews.
   - Leads & Inquiries management with multi-criteria filtering and status updates.
   - Role & Keyword management (add/edit roles, edit keywords and weights).
   - Jobs & Internships management with live publishing toggle.
   - Media Library & Dynamic Testimonials management.
6. **Exports**:
   - Multi-sheet Excel workbook (`.xlsx`) generator and CSV exports for Candidates and Leads.
7. **Security & QA**:
   - Strict MIME validation, UUID file renaming, RLS / server-side authorization guards, end-to-end testing, and production build verification.
