# MISSION CONTROL — Agent Visibility & Workflow Upgrade

**Spec Version:** 1.0
**Date:** 2026-02-18
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Recommended Model:** Sonnet for all work. This is CRUD + UI — no complex architecture.
**Prerequisite:** FOUNDATION_SPEC.md should be completed or in progress. This spec adds admin-facing pages that sit alongside the existing platform.

---

## Context

Ryan reviewed Alex Finn's "Mission Control" approach to managing OpenClaw agents and compared it against our existing AGENT_FRAMEWORK.md. Our framework is strong on **process and rigor** (spec-driven development, model routing, cost tracking) but weak on **visibility and proactivity** (no task board, no memory UI, no calendar view, no activity feed).

This spec closes those gaps. It adds a Mission Control dashboard to the platform's admin area that gives Ryan real-time visibility into what Tom is working on, what's scheduled, and what's been completed — without breaking anything in the existing ReceiptsFlow or platform foundation.

**CRITICAL:** This is an ADDITION, not a refactor. Do NOT modify any existing files in the platform unless explicitly stated. All new pages go under `(platform)/admin/mission-control/`. All new tables are additive. Existing MEMORY.md workflow, financial tracking, and all other systems remain untouched.

---

## Overview

Mission Control is an internal admin dashboard (Ryan-only access) with 4 core components:

1. **Tasks Board** — Kanban-style board tracking what Ryan and Tom are working on
2. **Memory Viewer** — Searchable UI for Tom's memory files and daily logs
3. **Calendar / Schedule View** — All cron jobs, scheduled tasks, and recurring automations in one place
4. **Activity Feed** — Timeline of Tom's recent actions (commits, deploys, tasks completed)

---

## Pages & Routes

```
app/(platform)/admin/mission-control/
├── page.tsx                    # Mission Control dashboard (overview of all 4 components)
├── tasks/
│   └── page.tsx                # Full tasks board (Kanban)
├── memory/
│   └── page.tsx                # Memory viewer + search
├── calendar/
│   └── page.tsx                # Scheduled tasks calendar
└── activity/
    └── page.tsx                # Activity feed timeline
```

**Access control:** All `/admin/` routes should check that the authenticated user is Ryan (check against Ryan's specific user_id or email in an environment variable). Return 403 for anyone else. Use:

```
ADMIN_USER_ID=ryan-uuid-here
```

---

## 1. Tasks Board

### Purpose
A Kanban board where both Ryan and Tom can see what's being worked on. Ryan adds tasks and priorities. Tom updates status as work progresses. This is the connective tissue between specs and execution.

### Database Table: `tasks`

```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT DEFAULT 'tom' CHECK (assigned_to IN ('ryan', 'tom', 'unassigned')),
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  category TEXT DEFAULT 'feature' CHECK (category IN ('feature', 'bug', 'content', 'admin', 'research', 'maintenance')),
  spec_reference TEXT,          -- e.g., "02-PAYSTUB_SPEC.md" — links to relevant spec
  related_tool TEXT,            -- e.g., "paystubs", "receipts", "platform"
  notes TEXT,                   -- Tom's progress notes or Ryan's context
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- No RLS needed — admin-only table
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

### Seed Data
Pre-populate with current known tasks so the board isn't empty on first load:

```sql
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
```

### UI Layout

**Kanban columns:** Backlog | In Progress | Review | Done | Blocked

Each task card shows:
- Title (bold)
- Assigned to badge: 🧑 Ryan (blue) or 🤖 Tom (green)
- Priority indicator: 🔴 Urgent, 🟠 High, 🟡 Medium, ⚪ Low
- Category tag
- Related tool badge (if set)
- Due date (if set, red if overdue)

**Top bar:**
- Filter by: Assigned To, Priority, Category, Related Tool
- "+ New Task" button
- Summary stats: Total tasks, In Progress, Blocked, Completed this week

**Interactions:**
- Click card → expand/edit inline or modal
- Drag-and-drop between columns to update status (if feasible with Tailwind-only approach; if not, use dropdown to change status)
- Quick-add: type title + press Enter to add to Backlog

### API Routes

```
POST   /api/admin/tasks          — Create task
GET    /api/admin/tasks          — List tasks (with filters)
PUT    /api/admin/tasks/[id]     — Update task (status, notes, etc.)
DELETE /api/admin/tasks/[id]     — Delete task
```

All routes require admin auth check.

---

## 2. Memory Viewer

### Purpose
A searchable UI for viewing Tom's memory files instead of digging through GitHub or markdown files on disk. Shows both MEMORY.md (long-term) and daily logs in a clean interface with search.

### Approach

**Option A (Simple — Recommended for V1):** Read from Tom's memory backup repo via GitHub API or from the local filesystem if running locally. Display the markdown rendered as HTML.

**Option B (Database-backed — V2):** Store memory entries in a Supabase table for faster search.

**For V1, use Option A.** Tom's memory already lives in `tom-memory-backup` on GitHub. Fetch and render.

### Database Table: `memory_entries` (for V2, create now for future use)

```sql
CREATE TABLE memory_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT DEFAULT 'daily_log' CHECK (entry_type IN ('daily_log', 'long_term', 'decision', 'preference', 'project_status')),
  title TEXT,
  content TEXT NOT NULL,
  source_file TEXT,              -- e.g., "memory/2026-02-18.md" or "MEMORY.md"
  tags TEXT[] DEFAULT '{}',
  entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_memory_entries_type ON memory_entries(entry_type);
CREATE INDEX idx_memory_entries_date ON memory_entries(entry_date DESC);
CREATE INDEX idx_memory_search ON memory_entries USING GIN (to_tsvector('english', content));
```

### UI Layout

**Left sidebar:** List of memory files by date (newest first)
- MEMORY.md (pinned at top — long-term memory)
- Daily logs grouped by month

**Main area:** Rendered markdown content of the selected file

**Top bar:**
- 🔍 Global search box — searches across all memory content
- Filter by type: All, Daily Logs, Long-Term, Decisions
- Date range filter

**Search results:** Show matching entries with highlighted search terms, date, and file source. Click to view full entry.

### API Routes

```
GET /api/admin/memory                — List memory files/entries
GET /api/admin/memory/search?q=term  — Full-text search across memory
GET /api/admin/memory/[file]         — Get specific memory file content
```

### V1 Implementation Notes
- For V1, if you can read Tom's memory files from the filesystem (~/tom-memory-backup/), just do that. Render markdown to HTML using a simple markdown renderer.
- If filesystem access isn't available in the web app context, fetch from the GitHub repo API: `https://api.github.com/repos/Rydogg7533/tom-memory-backup/contents/`
- Search can be client-side for V1 (load all content, filter with JavaScript). Move to Postgres full-text search when the data grows.

---

## 3. Calendar / Schedule View

### Purpose
A single view showing all scheduled/recurring tasks — cron jobs, content generation schedule, maintenance tasks, financial processing. This lets Ryan confirm that automated tasks are actually set up correctly and running on schedule.

### Database Table: `scheduled_tasks`

```sql
CREATE TABLE scheduled_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'daily', 'weekly', 'monthly', 'one_time')),
  cron_expression TEXT,          -- e.g., "0 9 * * 1,3,5" for MWF at 9am
  schedule_description TEXT,     -- Human-readable: "Monday, Wednesday, Friday at 9 AM UTC"
  category TEXT DEFAULT 'system' CHECK (category IN ('content', 'financial', 'maintenance', 'monitoring', 'system')),
  related_tool TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'skipped')),
  next_run_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Seed Data

```sql
INSERT INTO scheduled_tasks (title, description, schedule_type, cron_expression, schedule_description, category, related_tool, is_active) VALUES
('SEO Content Generation', 'Haiku generates blog post draft from keyword queue', 'cron', '0 9 * * 1,3,5', 'Monday, Wednesday, Friday at 9 AM UTC', 'content', 'platform', true),
('Financial Inbox Processing', 'Process files in ~/Desktop/Financial Inbox/', 'daily', NULL, 'Every 30 min during daytime', 'financial', NULL, true),
('Weekly Spend Report', 'Generate Tiller weekly spend report with category breakdown', 'weekly', NULL, 'Weekly', 'financial', NULL, true),
('Monthly Reconciliation', 'ON USER REQUEST ONLY — compare expected vs actual bills/receipts', 'monthly', NULL, 'On request', 'financial', NULL, true),
('Vercel Deploy Monitor', 'Check for failed deployments', 'daily', NULL, 'Continuous', 'monitoring', 'platform', true),
('Stripe Webhook Health', 'Verify webhook deliveries are succeeding', 'daily', NULL, 'Daily check', 'monitoring', 'platform', false),
('Memory Backup', 'Push memory updates to tom-memory-backup repo', 'daily', NULL, 'End of day', 'system', NULL, true);
```

### UI Layout

**Calendar view (default):** Monthly calendar grid showing scheduled tasks as colored blocks by category:
- 🟣 Content (purple)
- 🟢 Financial (green)
- 🔵 System/Maintenance (blue)
- 🟠 Monitoring (orange)

**List view (toggle):** Sortable table of all scheduled tasks with columns:
- Title, Schedule, Category, Last Run, Status, Next Run, Active toggle

**Today's panel (right sidebar):**
- What's scheduled for today
- What ran recently + status
- Upcoming in the next 7 days

**Interactions:**
- Click a scheduled task → view details, edit, toggle active/inactive
- "+ Add Scheduled Task" button
- Filter by category, active/inactive

### API Routes

```
GET    /api/admin/scheduled-tasks           — List all
POST   /api/admin/scheduled-tasks           — Create
PUT    /api/admin/scheduled-tasks/[id]      — Update (including logging last_run_at/status)
DELETE /api/admin/scheduled-tasks/[id]      — Delete
```

---

## 4. Activity Feed

### Purpose
A timeline showing Tom's recent actions — tasks completed, files changed, cron jobs run, errors encountered. This is Ryan's "what happened while I was away" view.

### Database Table: `activity_log`

```sql
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT DEFAULT 'tom' CHECK (actor IN ('tom', 'ryan', 'system', 'cron')),
  action_type TEXT NOT NULL CHECK (action_type IN ('task_completed', 'task_started', 'deploy', 'cron_run', 'error', 'memory_update', 'file_processed', 'content_generated', 'note')),
  title TEXT NOT NULL,
  description TEXT,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_tool TEXT,
  metadata JSONB DEFAULT '{}',    -- Flexible: commit SHA, error details, file paths, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor);
CREATE INDEX idx_activity_log_type ON activity_log(action_type);
```

### UI Layout

**Timeline view:** Vertical timeline (newest first), each entry shows:
- Timestamp
- Actor icon: 🤖 Tom, 🧑 Ryan, ⚙️ System, ⏰ Cron
- Action type badge (color-coded)
- Title + description
- Link to related task (if applicable)

**Filters:**
- Actor filter: All, Tom, Ryan, System
- Action type filter
- Date range
- Related tool

**Summary strip at top:**
- Tasks completed today: X
- Cron jobs run today: X
- Errors today: X (red if > 0)

### API Routes

```
GET  /api/admin/activity          — List activity (paginated, newest first)
POST /api/admin/activity          — Log an activity entry
```

### How Activities Get Logged

**Tom should log activities by making POST requests to `/api/admin/activity` at key moments:**

1. When starting a task → `task_started`
2. When completing a task → `task_completed`
3. When a cron job runs → `cron_run` (include success/failure in metadata)
4. When processing a financial file → `file_processed`
5. When generating SEO content → `content_generated`
6. When encountering an error → `error`
7. When updating memory → `memory_update`
8. For general notes/observations → `note`

**Add this to your workflow going forward, Tom:** Whenever you complete a meaningful action, log it to the activity feed. This is how Ryan stays informed without having to ask.

---

## 5. Mission Control Dashboard (Overview Page)

The main `/admin/mission-control/` page is a summary view pulling from all 4 components:

**Layout — 2x2 grid:**

| Tasks Summary | Activity Feed (last 10) |
|---|---|
| Calendar (next 7 days) | Memory (recent entries) |

Each quadrant shows a condensed view with a "View All →" link to the full page.

**Top bar stats:**
- 🔴 Blocked tasks: X
- 🟡 In Progress: X
- ✅ Completed this week: X
- ⏰ Scheduled today: X
- ⚠️ Errors today: X

---

## Sidebar Integration

Add Mission Control to the admin section of the sidebar. This should only be visible to Ryan (admin user):

```typescript
// Only show if user is admin
const adminTools = [
  { name: 'Mission Control', href: '/admin/mission-control', icon: Monitor, active: true },
  { name: 'Content Manager', href: '/admin/content', icon: FileEdit, active: true },  // from SEO_PIPELINE_SPEC
]
```

---

## Components

```
components/admin/mission-control/
├── TaskBoard.tsx               # Kanban board
├── TaskCard.tsx                # Individual task card
├── TaskForm.tsx                # Create/edit task modal
├── MemoryViewer.tsx            # Memory file viewer with markdown rendering
├── MemorySearch.tsx            # Search component
├── ScheduleCalendar.tsx        # Calendar grid view
├── ScheduleList.tsx            # List view of scheduled tasks
├── ActivityTimeline.tsx        # Vertical timeline
├── ActivityEntry.tsx           # Individual timeline entry
├── MissionControlDashboard.tsx # Overview 2x2 grid
└── AdminGuard.tsx              # Auth wrapper that checks admin access
```

---

## Future Improvements (PHASE 2 — Notify Ryan When Ready)

**Tom: When you've completed this spec and the core platform tools (pay stubs, invoices, expenses) are stable, notify Ryan that it's time to consider these Phase 2 upgrades. Add a task to the tasks board for each one so they don't get lost.**

### 2A. Proactive Task Pickup
Once the task board is established and Tom is consistently logging activities, explore giving Tom autonomy to pick up backlog tasks without waiting for explicit instruction. Start small: Tom checks the task board daily and picks up one `low` or `medium` priority task from the backlog if nothing higher-priority is in progress.

**When to suggest:** After 2+ weeks of consistent task board usage and activity logging.

### 2B. Memory Full-Text Search (Postgres)
Migrate memory from file-based to the `memory_entries` Supabase table with Postgres full-text search. This enables instant search across all memory without loading everything client-side.

**When to suggest:** When memory files exceed 50+ entries or search becomes slow.

### 2C. Agent Team Visualization
Build a "Team" page showing Tom's sub-agents (if Tom starts spawning sub-agents for specific roles like content writing, code review, etc.). Display each agent's role, current status, and assigned tasks.

**When to suggest:** If/when OpenClaw supports persistent sub-agents or when the workflow naturally splits into specialized agent roles.

### 2D. Automated Activity Logging
Instead of Tom manually POSTing to the activity feed, hook into GitHub webhooks (commits, deploys) and Vercel deploy hooks to auto-populate the activity feed. Also hook into Supabase to log database changes automatically.

**When to suggest:** After the manual activity logging is working well for 2+ weeks and Ryan wants less manual overhead.

### 2E. Smart Notifications
Build a notification system that pings Ryan (email or Slack) when specific events happen: task blocked for >24 hours, cron job fails, error spike detected, content draft ready for review. Replace Ryan's manual daily check with push notifications.

**When to suggest:** Once monitoring is solid and Ryan has defined what he wants to be alerted about.

### 2F. Bitcoin Metrics Site Planning
Ryan has a product idea in MEMORY.md about a Bitcoin metrics/charts site. When the ToolSuite platform is stable and generating revenue, Tom should flag this and help Ryan plan the monetization strategy.

**When to suggest:** After ToolSuite has stable MRR and Ryan has bandwidth for a second project.

---

## Implementation Order

1. Run the SQL for all new tables: `tasks`, `memory_entries`, `scheduled_tasks`, `activity_log`
2. Seed the tasks and scheduled_tasks with the provided data
3. Build the `AdminGuard` component (admin auth check)
4. Build the Tasks Board page (this is highest value — do this first)
5. Build the Activity Feed page + POST endpoint
6. Build the Calendar/Schedule view
7. Build the Memory Viewer (V1 — file-based or GitHub API)
8. Build the Mission Control dashboard overview page
9. Add Mission Control to the sidebar (admin-only section)
10. **Start logging activities** — from this point forward, log meaningful actions to the activity feed
11. Add the Phase 2 items as tasks in the task board so they're tracked

---

## Success Criteria

- [ ] Tasks board shows Kanban columns with drag-or-click status updates
- [ ] Tasks can be created, edited, assigned, and filtered
- [ ] Seed data appears correctly on first load
- [ ] Memory viewer displays Tom's memory files with rendered markdown
- [ ] Memory search finds content across files
- [ ] Calendar shows scheduled tasks in monthly grid + list view
- [ ] Activity feed displays timeline entries newest-first
- [ ] Activity entries can be created via POST API
- [ ] Mission Control dashboard shows overview of all 4 components
- [ ] Admin-only access enforced (non-admin users get 403)
- [ ] Existing platform, ReceiptsFlow, and all other features are UNAFFECTED
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Phase 2 items are added as tasks in the task board

---

## Notes for Tom

- **DO NOT touch any existing files outside of the admin routes.** This is entirely additive. The only modification to an existing file is adding the Mission Control link to the sidebar (and only in the admin section).
- The task board is the most important component. If you're short on time, ship the task board first and everything else can follow.
- For the Kanban drag-and-drop: if a pure Tailwind/vanilla JS implementation is too complex, just use dropdowns to change status. Functional > fancy.
- The activity feed is only useful if you actually use it. **From the moment the POST endpoint is live, start logging your work there.** Even simple entries like "Started working on pay stub form" or "Deployed foundation layout update" are valuable.
- The memory viewer V1 can be dead simple — even just an iframe or pre-rendered markdown. Don't over-engineer it.
- For the calendar, a simple CSS grid calendar is fine. Don't add a calendar library.
- All admin API routes should check `ADMIN_USER_ID` env var against the authenticated user. Keep it simple — no role system needed, just a single admin check.
- Commit this work in small pieces. Task board first, then activity feed, then calendar, then memory viewer, then the dashboard overview.
- **This spec was inspired by Alex Finn's Mission Control approach but adapted to fit our spec-driven workflow.** We're keeping what works (detailed specs, model routing, cost tracking) and adding what we were missing (visibility, scheduling, activity tracking).
