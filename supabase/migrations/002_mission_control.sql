-- Mission Control Schema
-- Tables: tasks, scheduled_tasks, activity_log, memory_entries

-- 1. TASKS TABLE
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT DEFAULT 'tom' CHECK (assigned_to IN ('ryan', 'tom', 'unassigned')),
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  category TEXT DEFAULT 'feature' CHECK (category IN ('feature', 'bug', 'content', 'admin', 'research', 'maintenance')),
  spec_reference TEXT,
  related_tool TEXT,
  notes TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);

-- 2. SCHEDULED_TASKS TABLE
CREATE TABLE scheduled_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'daily', 'weekly', 'monthly', 'one_time')),
  cron_expression TEXT,
  schedule_description TEXT,
  category TEXT DEFAULT 'system' CHECK (category IN ('content', 'financial', 'maintenance', 'monitoring', 'system')),
  related_tool TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'skipped')),
  next_run_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active);
CREATE INDEX idx_scheduled_tasks_category ON scheduled_tasks(category);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at);

-- 3. ACTIVITY_LOG TABLE
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT DEFAULT 'tom' CHECK (actor IN ('tom', 'ryan', 'system', 'cron')),
  action_type TEXT NOT NULL CHECK (action_type IN ('task_completed', 'task_started', 'deploy', 'cron_run', 'error', 'memory_update', 'file_processed', 'content_generated', 'note')),
  title TEXT NOT NULL,
  description TEXT,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_tool TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor);
CREATE INDEX idx_activity_log_type ON activity_log(action_type);

-- 4. MEMORY_ENTRIES TABLE (V2 — for future use, create now)
CREATE TABLE memory_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT DEFAULT 'daily_log' CHECK (entry_type IN ('daily_log', 'long_term', 'decision', 'preference', 'project_status')),
  title TEXT,
  content TEXT NOT NULL,
  source_file TEXT,
  tags TEXT[] DEFAULT '{}',
  entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_memory_entries_type ON memory_entries(entry_type);
CREATE INDEX idx_memory_entries_date ON memory_entries(entry_date DESC);

-- Seed: TASKS
INSERT INTO tasks (title, description, assigned_to, status, priority, category, spec_reference, related_tool) VALUES
('Complete Foundation Spec', 'Route restructuring, platform shell, sidebar, database migrations', 'tom', 'in_progress', 'urgent', 'feature', '01-FOUNDATION_SPEC.md', 'platform'),
('Build Pay Stub Generator', 'Full CRUD + PDF generation + live preview', 'tom', 'backlog', 'high', 'feature', '02-PAYSTUB_SPEC.md', 'paystubs'),
('Build Invoice Generator', 'Invoice CRUD + PDF + smart line items', 'tom', 'backlog', 'medium', 'feature', '05-INVOICE_SPEC.md', 'invoices'),
('Build Expense Tracker', 'Expense CRUD + ReceiptsFlow integration trigger', 'tom', 'backlog', 'medium', 'feature', '06-EXPENSE_TRACKER_SPEC.md', 'expenses'),
('SEO Content Pipeline', 'Haiku content generation + admin review UI + blog frontend', 'tom', 'backlog', 'high', 'content', '04-SEO_PIPELINE_SPEC.md', 'platform'),
('Landing Pages', 'Homepage + tool landing pages with SEO copy', 'tom', 'backlog', 'medium', 'content', '03-LANDING_PAGE_COPY.md', 'platform'),
('Create Stripe Price Tiers', 'Set up Single Tool, Pro Bundle, Team pricing in Stripe dashboard', 'ryan', 'backlog', 'high', 'admin', '01-FOUNDATION_SPEC.md', 'platform'),
('Set up ANTHROPIC_API_KEY', 'Get API key from console.anthropic.com for SEO pipeline', 'ryan', 'backlog', 'medium', 'admin', '04-SEO_PIPELINE_SPEC.md', 'platform'),
('Build Mission Control', 'Task board, memory viewer, calendar, activity feed', 'tom', 'in_progress', 'high', 'feature', '07-MISSION_CONTROL_SPEC.md', 'platform');

-- Seed: SCHEDULED_TASKS
INSERT INTO scheduled_tasks (title, description, schedule_type, cron_expression, schedule_description, category, related_tool, is_active) VALUES
('SEO Content Generation', 'Haiku generates blog post draft from keyword queue', 'cron', '0 9 * * 1,3,5', 'Monday, Wednesday, Friday at 9 AM UTC', 'content', 'platform', true),
('Financial Inbox Processing', 'Process files in ~/Desktop/Financial Inbox/', 'daily', NULL, 'Every 30 min during daytime', 'financial', NULL, true),
('Weekly Spend Report', 'Generate Tiller weekly spend report with category breakdown', 'weekly', NULL, 'Weekly', 'financial', NULL, true),
('Monthly Reconciliation', 'ON USER REQUEST ONLY — compare expected vs actual bills/receipts', 'monthly', NULL, 'On request', 'financial', NULL, true),
('Vercel Deploy Monitor', 'Check for failed deployments', 'daily', NULL, 'Continuous', 'monitoring', 'platform', true),
('Stripe Webhook Health', 'Verify webhook deliveries are succeeding', 'daily', NULL, 'Daily check', 'monitoring', 'platform', false),
('Memory Backup', 'Push memory updates to tom-memory-backup repo', 'daily', NULL, 'End of day', 'system', NULL, true);
