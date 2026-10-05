-- ============================================================
-- Migration: 005_add_read_status_to_candidates_and_leads.sql
-- Description: Adds is_read and viewed_at columns for real-time notification tracking
-- Date: 2026-10-04
-- ============================================================

-- 1. Add columns to candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ NULL;

-- 2. Add columns to leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ NULL;

-- 3. Safely backfill existing historical records as read so old data does not flood notification count
UPDATE candidates SET is_read = TRUE, viewed_at = created_at WHERE is_read IS FALSE;
UPDATE leads SET is_read = TRUE, viewed_at = created_at WHERE is_read IS FALSE;

-- 4. Create partial indexes for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_candidates_unread ON candidates(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_unread ON leads(is_read) WHERE is_read = FALSE;
