-- Migration 001: Foundation Platform Tables
-- Creates: contacts, tool_access
-- Modifies: profiles

-- Table: contacts
CREATE TABLE contacts (
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

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
  ON contacts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);

-- Table: tool_access
CREATE TABLE tool_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_slug TEXT NOT NULL CHECK (tool_slug IN ('receipts', 'paystubs', 'invoices', 'expenses', 'time_tracker', 'contracts', 'pnl', 'tax_calc')),
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, tool_slug)
);

ALTER TABLE tool_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tool access"
  ON tool_access FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_tool_access_user_id ON tool_access(user_id);

-- Modify: profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
