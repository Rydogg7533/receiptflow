# FOUNDATION SPEC — Expanding ReceiptsFlow into a Multi-Tool Platform

**Spec Version:** 1.0
**Date:** 2026-02-16
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Recommended Model:** Sonnet for most work. Escalate to Opus for database schema decisions and Stripe billing restructuring.

---

## Overview

We are expanding the existing ReceiptsFlow app into a **multi-tool business platform** called **ToolSuite** (working name — Ryan can rename later). ReceiptsFlow becomes the first module inside a shared platform shell. Additional tools (Pay Stub Generator, Invoice Generator, Expense Tracker, etc.) will be added as new route groups that share the same auth, billing, database, and UI shell.

**The goal of this spec is NOT to build new tools.** It is to restructure the existing app so that new tools can be added with minimal effort. Think of it as building the house frame before adding rooms.

---

## Current State (What Exists)

Based on the codebase at `github.com/Rydogg7533/receiptflow`:

### Tech Stack
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (Postgres + RLS)
- **Auth:** Supabase Auth (email-based, via `@supabase/auth-helpers-nextjs` + `@supabase/ssr`)
- **Billing:** Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`, `stripe`)
- **AI:** OpenAI GPT-4o-mini (document extraction)
- **Styling:** Tailwind CSS + `next-themes` (dark mode)
- **File Upload:** Supabase Storage (bucket: `documents`)
- **Export:** CSV + Google Sheets (OAuth integration)
- **Hosting:** Vercel (33 deployments, production live)
- **Icons:** Lucide React

### Current File Structure
```
receiptflow/
├── app/
│   ├── api/
│   │   ├── auth/google/        # Google OAuth for Sheets
│   │   ├── billing/            # Stripe billing
│   │   ├── checkout/           # Stripe checkout
│   │   ├── documents/          # Document CRUD
│   │   ├── export/             # CSV/Sheets export
│   │   ├── extract/            # AI extraction
│   │   ├── google/status/      # Google connection status
│   │   ├── profile/            # User profile
│   │   ├── subscription/       # Subscription management
│   │   └── upload/             # File upload
│   ├── app/
│   │   └── page.tsx            # Main app page (ReceiptsFlow)
│   ├── auth/callback/          # Auth callback handler
│   ├── landing/                # Landing page
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Root → landing
├── components/                 # React components
├── lib/
│   ├── google/                 # Google Sheets integration
│   ├── csv.ts
│   ├── openai.ts
│   ├── pdf_convert_cloudconvert.ts
│   ├── stripe.ts
│   └── supabase.ts
├── supabase/
│   └── schema.sql              # Database schema
├── middleware.ts                # Supabase auth middleware
├── next.config.js
├── tailwind.config.js
└── package.json
```

### Current Database Tables
1. **documents** — uploaded files with extraction status and JSONB extracted_data
2. **export_batches** — CSV/Sheets export tracking
3. **google_connections** — Google OAuth tokens
4. **profiles** — user info + Stripe subscription fields

---

## What Needs to Change

### 1. Route Restructuring

**Current:** `/app/app/page.tsx` is the ReceiptsFlow app
**New:** Each tool gets its own route group under `/app/(platform)/`

```
app/
├── (marketing)/              # Public pages (no auth required)
│   ├── page.tsx              # Landing/homepage
│   ├── landing/              # Can keep existing or merge with root
│   ├── pricing/              # NEW — pricing page showing all tools
│   │   └── page.tsx
│   └── layout.tsx            # Marketing layout (no sidebar)
│
├── (auth)/                   # Auth pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── layout.tsx            # Minimal auth layout
│
├── (platform)/               # Authenticated app — ALL TOOLS LIVE HERE
│   ├── layout.tsx            # NEW — Platform shell with sidebar + tool switcher
│   ├── dashboard/            # NEW — Unified dashboard
│   │   └── page.tsx
│   ├── receipts/             # MOVED from /app/app — ReceiptsFlow module
│   │   └── page.tsx
│   ├── paystubs/             # NEW — Pay Stub Generator (next spec)
│   │   └── page.tsx
│   ├── invoices/             # FUTURE — placeholder
│   ├── expenses/             # FUTURE — placeholder
│   ├── settings/             # NEW — Account settings, billing, tool management
│   │   └── page.tsx
│   └── contacts/             # NEW — Shared contacts (future)
│
├── api/                      # Keep existing, add new routes as needed
│   ├── (existing routes)
│   └── paystubs/             # NEW — Pay Stub API routes
│
├── auth/callback/            # Keep existing
├── globals.css
├── layout.tsx                # Root layout
└── page.tsx                  # Redirect to marketing or dashboard based on auth
```

**IMPORTANT:** When moving ReceiptsFlow to `/receipts/`, all existing functionality MUST continue working. This is a move, not a rewrite. Update imports but don't refactor the working code.

### 2. Platform Shell (Layout)

Create `app/(platform)/layout.tsx` — a shared layout for all authenticated tool pages.

**Requirements:**
- Sidebar navigation (collapsible on mobile)
- Tool switcher showing: Dashboard, Receipts, Pay Stubs, (future tools grayed out or hidden)
- User avatar/menu in sidebar bottom with: Settings, Billing, Sign Out
- Active tool highlighted in sidebar
- Responsive: sidebar collapses to hamburger menu on mobile
- Dark mode support (already have `next-themes`)
- Breadcrumb or page title area at top

**Design direction:**
- Clean, professional SaaS aesthetic
- Dark theme as default (matches existing ReceiptsFlow)
- Tailwind only — no additional UI libraries needed (you already have Lucide for icons)
- Think Linear, Vercel Dashboard, or Stripe Dashboard aesthetic — minimal, functional, clear

**Component structure:**
```
components/
├── platform/
│   ├── Sidebar.tsx           # Main sidebar nav
│   ├── ToolSwitcher.tsx      # List of available tools
│   ├── UserMenu.tsx          # Avatar + dropdown
│   ├── PageHeader.tsx        # Title + breadcrumbs
│   └── MobileNav.tsx         # Mobile hamburger nav
├── (existing components)     # Keep all existing ReceiptsFlow components
```

### 3. Database Schema Additions

**MODEL RECOMMENDATION: Escalate to Opus for this section.** Database schema decisions are hard to undo.

Add these tables to Supabase. Do NOT modify existing tables — only ADD new ones and add columns where specified.

#### New Table: `contacts`
Shared across all tools. When a user creates a pay stub for an employee or sends an invoice to a client, the contact is stored here and reusable across tools.

```sql
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
```

#### New Table: `tool_access`
Tracks which tools each user has activated. Used for entitlement checks and future per-tool billing.

```sql
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
```

#### Modify: `profiles` table
Add a column for the user's display name and business info (used across tools):

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
```

### 4. Shared Utility: Supabase Client Helper

Create `lib/supabase-server.ts` — a server-side Supabase client creator for use in Server Components and API routes. This may already partially exist but should be standardized.

```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

### 5. Middleware Update

Update `middleware.ts` to:
- Redirect unauthenticated users hitting `/(platform)/` routes to `/login`
- Allow `/(marketing)/` routes without auth
- Keep existing auth refresh behavior

```typescript
// Add to the existing middleware, after supabase.auth.getSession():
const { data: { session } } = await supabase.auth.getSession()

const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                   request.nextUrl.pathname.startsWith('/signup')
const isPlatformPage = request.nextUrl.pathname.startsWith('/dashboard') ||
                       request.nextUrl.pathname.startsWith('/receipts') ||
                       request.nextUrl.pathname.startsWith('/paystubs') ||
                       request.nextUrl.pathname.startsWith('/settings')

if (!session && isPlatformPage) {
  return NextResponse.redirect(new URL('/login', request.url))
}

if (session && isAuthPage) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

### 6. Dashboard Page

Create `app/(platform)/dashboard/page.tsx` — a simple unified dashboard.

**For now, keep it simple:**
- Welcome message with user's name
- Cards showing available tools with status (Active / Coming Soon)
- Quick stats: total documents processed (from ReceiptsFlow), subscription status
- "Quick actions" buttons: Upload Receipt, Create Pay Stub (links to respective tools)

**Do NOT over-engineer this.** A simple grid of tool cards + basic stats is enough for launch. We'll add cross-tool intelligence later.

### 7. Settings Page

Create `app/(platform)/settings/page.tsx`

**Tabs:**
- **Profile** — display name, email, business name, business address, logo upload
- **Billing** — current plan, manage subscription (link to Stripe portal), usage stats
- **Tools** — list of available tools with activate/deactivate toggles

This replaces any existing account management that lived inside ReceiptsFlow.

### 8. Pricing Page

Create `app/(marketing)/pricing/page.tsx`

**Structure:**
- 3 tiers: 
  - **Single Tool** — $9/mo — Access to any one tool
  - **Pro Bundle** — $29/mo — Access to all tools (BEST VALUE badge)
  - **Team** — $79/mo — All tools + 5 team members (future — show as "Coming Soon")
- Feature comparison table below tiers
- FAQ section at bottom
- CTA buttons → Stripe checkout

**NOTE:** The actual Stripe products/prices need to be created in the Stripe dashboard. For now, the pricing page can use placeholder price IDs that Ryan will update. Add environment variables:

```
NEXT_PUBLIC_STRIPE_PRICE_SINGLE=price_placeholder_single
NEXT_PUBLIC_STRIPE_PRICE_BUNDLE=price_placeholder_bundle
NEXT_PUBLIC_STRIPE_PRICE_TEAM=price_placeholder_team
```

---

## What NOT to Change

- **Do NOT refactor ReceiptsFlow's existing code.** Move files, update imports, but keep the working logic identical.
- **Do NOT remove any existing API routes.** They all still work.
- **Do NOT change the existing Stripe integration.** We'll add new price tiers alongside the existing $29/mo plan.
- **Do NOT add new npm packages** unless absolutely necessary. The current stack (Next.js, Tailwind, Supabase, Stripe, Lucide) is sufficient.
- **Do NOT implement an event bus yet.** That's Phase 2. For now, tools are independent modules that share a database and auth.

---

## Implementation Order

Tom should implement in this order to minimize breakage:

1. **Database first** — Run the new SQL (contacts, tool_access, profiles additions) in Supabase
2. **Create the platform layout** — `(platform)/layout.tsx` with sidebar
3. **Move ReceiptsFlow** — Move from `/app/app/` to `/(platform)/receipts/`, update imports
4. **Create dashboard** — Simple dashboard page
5. **Create settings** — Profile + billing management
6. **Create pricing page** — Public pricing with 3 tiers
7. **Update middleware** — Auth redirects for platform routes
8. **Update root page** — Route based on auth state (logged in → dashboard, logged out → landing)
9. **Test everything** — ReceiptsFlow must still work exactly as before, just at `/receipts` instead of `/app`

---

## Success Criteria

- [ ] ReceiptsFlow works at `/receipts` with no regressions
- [ ] Platform sidebar shows tool navigation
- [ ] Dashboard page loads with tool cards
- [ ] Settings page shows profile and billing
- [ ] Pricing page shows 3 tiers
- [ ] Unauthenticated users redirected to login from platform routes
- [ ] Authenticated users redirected to dashboard from login/signup
- [ ] New database tables created with RLS policies
- [ ] Mobile responsive sidebar navigation works
- [ ] Dark mode works across all new pages

---

## Notes for Tom

- This is a **restructuring** task, not a feature-building task. The goal is to create the skeleton that future tools plug into.
- When in doubt about a design decision, keep it simple. We can iterate later.
- Commit frequently — don't batch everything into one massive commit.
- If you hit a conflict between the existing ReceiptsFlow code and the new structure, preserve ReceiptsFlow's functionality. The existing paying product takes priority.
- The Pay Stub Generator spec (separate document) will be the first tool that plugs into this foundation. It should be implementable by ONLY adding files to `(platform)/paystubs/` and `api/paystubs/` after this foundation is in place.
