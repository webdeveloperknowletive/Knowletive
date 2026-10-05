# FULL QA BACKUP MANIFEST

- **Date & Time:** 2026-10-04 00:43:00 IST
- **Detected Stack:**
  - Framework: Astro v5.4.1 (SSR / Node adapter `@astrojs/node` with filesystem sessions)
  - Frontend: Astro + Vanilla CSS / Tailwind CSS utilities + Lucide icons
  - Backend / Runtime: Astro Server Endpoints (Node.js runtime)
  - Database: Dual mode (Supabase PostgreSQL Client with local JSON fallback at `.data/db.json`)
  - Authentication: PBKDF2 Password Hashing + Cryptographic Salt, HMAC-SHA256 Signed Session Cookies (`knowletive_admin_session`)
  - Storage: Local filesystem file storage under `public/uploads/` (`resumes/`, `media/`, `testimonials/`)
  - Build System: Vite / Astro
- **Project Path:** `c:\Users\ayush\Downloads\Knowletiveweb - Copy`
  - Mirrored Dev Environment: `c:\Users\ayush\Downloads\Knowletiveweb - Copy - Copy`
- **Backup Directory:** `backup_before_full_qa_2026-10-04_00-43`

---

## Files Backed Up

1. `src/` (Entire application source: pages, components, layouts, library utilities, database access layer, types, styles)
2. `public/` (Static assets, logos, favicon, uploads directory for resumes, media, testimonials)
3. `migrations/` (PostgreSQL / Supabase migration SQL files)
4. `.data/` (Local JSON database store `db.json`)
5. `scripts/` (Automated verification, crawler, and regression test suites)
6. `package.json` & `package-lock.json` (Project dependencies and lockfile)
7. `.env.example` (Environment variable configuration template)
8. `astro.config.mjs` (Astro configuration with Node adapter, sitemap, tailwind)
9. `tsconfig.json` (TypeScript project configuration)
10. `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`

**Excluded from Backup (Per Instructions):**
- `node_modules`
- `dist`
- `.astro`
- `build cache`
- `.git`

---

## Current Build Status Before Modifications

- **Command:** `npm run build` (`astro build`)
- **Status:** **PASS** (Zero compile errors, exited code 0)
- **Output Mode:** `server` (SSR) with `@astrojs/node` adapter and sitemap generation
- **Verification Timestamp:** 2026-10-04 00:43:01 IST
