-- ============================================================
-- 004_update_media_library.sql
-- Add Category, Description, Publishing, and Ordering to Media Library
-- ============================================================

ALTER TABLE media_library ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'activities';
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_media_category_published ON media_library(category, is_published, display_order);
