-- Foundation Platform Migration
-- Date: 2026-02-16
-- Adds shared tables for multi-tool platform: contacts, tool_access
-- Also extends profiles table with business fields

-- ============================================================================
-- TABLE: contacts (NEW)
-- Shared across all tools for reusable contact management
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  type TEXT DEFAULT 'client' CHECK (type IN ('client', 'employee', 'vendor', 'other')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own contacts
CREATE POLICY "Users can manage their own contacts"
  ON contacts FOR ALL USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_email ON contacts(email);


-- ============================================================================
-- TABLE: tool_access (NEW)
-- Tracks which tools each user has activated
-- Used for entitlement checks and future per-tool billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS tool_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_slug TEXT NOT NULL CHECK (tool_slug IN (
    'receipts', 'paystubs', 'invoices', 'expenses', 
    'time_tracker', 'contracts', 'pnl', 'tax_calc'
  )),
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, tool_slug)
);

-- Enable RLS
ALTER TABLE tool_access ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own tool access (read-only)
-- Note: Tool provisioning is admin-controlled via Stripe webhook
CREATE POLICY "Users can view their own tool access"
  ON tool_access FOR SELECT USING (auth.uid() = user_id);

-- Index for common queries
CREATE INDEX idx_tool_access_user_id ON tool_access(user_id);
CREATE INDEX idx_tool_access_active ON tool_access(is_active);


-- ============================================================================
-- TABLE: profiles (MODIFICATIONS)
-- Extend existing profiles table with business information
-- ============================================================================

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

-- Index for business name search (optional, used if search is added later)
CREATE INDEX IF NOT EXISTS idx_profiles_business_name ON profiles(business_name);
