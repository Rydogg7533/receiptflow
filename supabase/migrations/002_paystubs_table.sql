-- Pay Stub Generator Table Migration
-- Date: 2026-02-16
-- Adds paystubs table for the Pay Stub Generator tool

CREATE TABLE IF NOT EXISTS paystubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Company info (snapshot at time of creation)
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  company_ein TEXT,
  company_logo_url TEXT,
  
  -- Employee info (snapshot)
  employee_name TEXT NOT NULL,
  employee_address TEXT,
  employee_id_number TEXT,
  ssn_last_four TEXT,
  pay_method TEXT DEFAULT 'direct_deposit' CHECK (pay_method IN ('direct_deposit', 'check', 'cash')),
  
  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  
  -- Financial data (JSONB for flexibility)
  earnings JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"description": "Regular Pay", "type": "hourly", "hours": 80, "rate": 25.00, "amount": 2000.00}]
  
  deductions JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"description": "Federal Tax", "type": "tax", "amount": 300.00}]
  
  gross_pay DECIMAL(10,2) NOT NULL,
  total_deductions DECIMAL(10,2) NOT NULL,
  net_pay DECIMAL(10,2) NOT NULL,
  
  ytd_gross DECIMAL(10,2) DEFAULT 0,
  ytd_deductions DECIMAL(10,2) DEFAULT 0,
  ytd_net DECIMAL(10,2) DEFAULT 0,
  
  -- PDF storage
  pdf_storage_path TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Meta
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE paystubs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own paystubs
CREATE POLICY "Users can manage their own paystubs"
  ON paystubs FOR ALL USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX idx_paystubs_user_id ON paystubs(user_id);
CREATE INDEX idx_paystubs_contact_id ON paystubs(contact_id);
CREATE INDEX idx_paystubs_pay_date ON paystubs(pay_date DESC);
CREATE INDEX idx_paystubs_employee_name ON paystubs(employee_name);
CREATE INDEX idx_paystubs_status ON paystubs(status);
