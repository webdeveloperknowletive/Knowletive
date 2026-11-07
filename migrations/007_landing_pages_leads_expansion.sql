-- Migration 007: Expand leads table for Service Landing Pages & Campaign Attribution
-- Backward-compatible: adds optional columns and indexes for UTM tracking and service-specific fields

ALTER TABLE IF EXISTS leads 
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS data_category TEXT,
  ADD COLUMN IF NOT EXISTS target_course TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS ebook_title TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Create indexes for frequent admin filtering
CREATE INDEX IF NOT EXISTS idx_leads_service_interest ON leads(service_interest);
CREATE INDEX IF NOT EXISTS idx_leads_landing_page ON leads(landing_page);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc ON leads(created_at DESC);

