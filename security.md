# Knowletive Web Security Architecture

This document outlines the security features and mechanisms implemented across the frontend, backend, API, and admin panel of the Knowletive application.

## 1. Authentication & Session Management
- **PBKDF2 Password Hashing**: User passwords are not stored in plain text. They are hashed using the PBKDF2 algorithm (10,000 iterations, 64-byte length, SHA-512) alongside a random 16-byte cryptographic salt.
- **Timing-Safe Verification**: Cryptographic timing-safe equality checks (`crypto.timingSafeEqual`) are used for password hash comparison and token signature validation, protecting against timing-based side-channel attacks.
- **Stateless Session Tokens**: The system uses custom JWT-like session tokens signed with an HMAC-SHA256 signature to ensure the payload is tamper-proof.
- **Secure Cookies**: Session tokens are stored in `HttpOnly` cookies to prevent client-side JavaScript access (mitigating XSS attacks). The cookies use `SameSite=Lax` (to mitigate CSRF) and are marked as `Secure` in production environments.

## 2. Server-Side Protection & Middleware
- **Admin Panel Access Control (RBAC)**: Middleware strictly enforces Role-Based Access Control. Any unauthenticated user or non-admin attempting to access `/admin` or `/admin/*` routes is immediately redirected to the home page (`/`). This prevents exposing partial UIs or unauthorized pages.
- **Protected API Endpoints**: Endpoints like `/api/admin`, `/api/exports`, and `/api/resumes/download` require valid admin sessions. Requests missing tokens or possessing insufficient roles are rejected with standard HTTP errors (`401 Unauthorized` or `403 Forbidden`).
- **Security Headers**: The middleware injects standard security headers to all responses:
  - `X-Frame-Options: SAMEORIGIN`: Prevents Clickjacking by disallowing the site to be framed by external domains.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing by browsers.
  - `Referrer-Policy: strict-origin-when-cross-origin`: Controls how much referrer information is sent with requests.

## 3. API & Data Security
- **Strict CORS Policy**: The application employs a dynamic and strict Cross-Origin Resource Sharing (CORS) policy. It actively verifies the `Origin` and `Host` headers, explicitly rejecting insecure wildcard (`*`) access on admin routes. Allowed origins are restricted strictly to localhost for development and the official `knowletive.com` domains.
- **Input Validation & Sanitization**: 
  - API routes (e.g., lead generation) enforce rigorous data validation.
  - Emails are validated against strict regex patterns.
  - Phone numbers are sanitized (stripping non-numeric characters) and validated to match specific formats (e.g., exact 10-digit Indian mobile numbers starting with 6-9).
- **Anti-Enumeration Mechanisms**: The login API returns generic error messages (e.g., "Invalid email or password.") for both incorrect passwords and non-existent accounts, preventing attackers from enumerating active users.

## 4. Database Security
- **Dual-Layer Connection**: The database layer connects to Supabase using secure environment variables (`SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`). 
- **Environment Variable Management**: Sensitive keys, secrets (like `ADMIN_SESSION_SECRET`), and connection strings are managed via environment variables and are never hardcoded in the repository.

## 5. Frontend Security
- **Astro Server Configuration**: The application is built using Astro configured with `output: 'server'` for SSR. Sensitive logic and API secrets run exclusively on the server and are not bundled with the client-side JavaScript.
