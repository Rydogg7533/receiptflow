# PAY STUB GENERATOR — Tool Module Spec

**Spec Version:** 1.0
**Date:** 2026-02-16
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Recommended Model:** Sonnet for all work. This is straightforward CRUD + PDF generation.
**Prerequisite:** FOUNDATION_SPEC.md must be completed first.

---

## Overview

The Pay Stub Generator is the second tool in the platform (after ReceiptsFlow). It lets users create professional pay stubs by filling out a form, then generates a downloadable PDF. It's intentionally simple — a form, a preview, and a PDF download. This simplicity is the product's strength.

**Target user:** Small business owners, freelancers paying contractors, individuals who need proof of income.
**Pricing:** Included in the $29/mo bundle. Also available as a single tool at $9/mo.
**Revenue model:** Unlimited pay stubs per month for subscribers. Optionally, a free tier could generate 1 pay stub with a watermark (growth hack for SEO traffic — implement this).

---

## User Flow

```
1. User navigates to /paystubs from sidebar
2. Sees list of previously generated pay stubs (if any)
3. Clicks "Create Pay Stub" button
4. Fills out the pay stub form (employer info, employee info, earnings, deductions)
5. Sees live preview of the pay stub as they fill in fields
6. Clicks "Generate PDF"
7. PDF is generated and available for download
8. Pay stub record is saved to database
9. User can view, re-download, or delete past pay stubs
```

---

## Pages & Routes

### `/paystubs` — Pay Stub List (Main Page)
```
app/(platform)/paystubs/page.tsx
```

**Layout:**
- Page header: "Pay Stubs" + "Create Pay Stub" button (top right)
- List/table of previously generated pay stubs showing:
  - Employee name
  - Pay period (start date — end date)
  - Pay date
  - Net pay amount
  - Date created
  - Actions: Download PDF, View, Delete
- Empty state for new users: illustration + "Create your first pay stub" CTA
- Sort by date (newest first)

### `/paystubs/create` — Create Pay Stub Form
```
app/(platform)/paystubs/create/page.tsx
```

**This is the core page.** Two-column layout on desktop:
- LEFT: Form inputs
- RIGHT: Live preview (PDF-like preview that updates as user types)

On mobile: form on top, preview below (or toggle between them).

### `/paystubs/[id]` — View Pay Stub
```
app/(platform)/paystubs/[id]/page.tsx
```

- Shows the rendered pay stub (same as preview but read-only)
- Download PDF button
- Edit button (goes back to form pre-filled)
- Delete button (with confirmation)

---

## Form Fields

### Section 1: Company / Employer Info
These fields should auto-fill from the user's profile (`profiles.business_name`, etc.) if available. User can override per pay stub.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Company Name | text | Yes | Auto-fill from profile |
| Company Address | text | No | Auto-fill from profile |
| Company Phone | text | No | Auto-fill from profile |
| Company EIN | text | No | Employer ID Number |
| Company Logo | image | No | Upload or use profile logo |

### Section 2: Employee Info
Should offer autocomplete from the `contacts` table (type='employee'). If the employee doesn't exist, create a new contact on save.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Employee Name | text | Yes | Autocomplete from contacts |
| Employee Address | text | No | |
| Employee ID | text | No | Custom employee number |
| SSN (last 4) | text | No | Only last 4 digits, masked display |
| Pay Method | select | Yes | Options: Direct Deposit, Check, Cash |

### Section 3: Pay Period
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Pay Period Start | date | Yes | |
| Pay Period End | date | Yes | |
| Pay Date | date | Yes | Defaults to Pay Period End |
| Pay Frequency | select | Yes | Weekly, Bi-Weekly, Semi-Monthly, Monthly |

### Section 4: Earnings
Dynamic list — user can add multiple earning lines.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Description | text | Yes | e.g., "Regular Pay", "Overtime", "Bonus" |
| Type | select | Yes | Hourly, Salary, Bonus, Commission, Other |
| Hours | number | Conditional | Required if type is Hourly |
| Rate | currency | Conditional | Required if type is Hourly |
| Amount | currency | Yes | Auto-calculated if hours × rate, manual for salary/bonus |

**Default first row:** "Regular Pay" / Hourly / blank hours / blank rate
User clicks "+ Add Earnings" to add more rows (Overtime, Bonus, etc.)

### Section 5: Deductions
Dynamic list — user can add multiple deduction lines.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Description | text | Yes | e.g., "Federal Tax", "State Tax", "401k", "Health Insurance" |
| Type | select | Yes | Tax, Retirement, Insurance, Other |
| Amount | currency | Yes | |

**Default rows (pre-populated but editable):**
- Federal Income Tax
- State Income Tax
- Social Security (6.2%)
- Medicare (1.45%)

User clicks "+ Add Deduction" for additional items (401k, health insurance, etc.)

### Section 6: Calculated Totals (Auto-calculated, read-only in form)
| Field | Calculation |
|-------|-------------|
| Gross Pay | Sum of all earnings |
| Total Deductions | Sum of all deductions |
| Net Pay | Gross Pay - Total Deductions |
| YTD Gross | Sum of all pay stubs for this employee this year |
| YTD Deductions | Sum of all deduction totals for this employee this year |
| YTD Net | YTD Gross - YTD Deductions |

---

## Database Schema

### New Table: `paystubs`

```sql
CREATE TABLE paystubs (
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
  
  -- Financial data
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
  
  -- PDF
  pdf_storage_path TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Meta
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE paystubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own paystubs"
  ON paystubs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_paystubs_user_id ON paystubs(user_id);
CREATE INDEX idx_paystubs_contact_id ON paystubs(contact_id);
CREATE INDEX idx_paystubs_pay_date ON paystubs(pay_date DESC);
CREATE INDEX idx_paystubs_employee_name ON paystubs(employee_name);
```

---

## API Routes

### `POST /api/paystubs` — Create pay stub
- Validate required fields
- Calculate totals (gross, deductions, net)
- Calculate YTD values (query existing paystubs for same employee + year)
- If contact_id provided, use it. If employee_name is new, create a contact with type='employee'
- Save to database
- Return the created paystub record

### `GET /api/paystubs` — List user's pay stubs
- Requires auth
- Returns all paystubs for the authenticated user
- Ordered by pay_date DESC
- Supports optional query params: `?employee=name` filter, `?year=2026` filter

### `GET /api/paystubs/[id]` — Get single pay stub
- Requires auth + ownership check
- Returns full paystub record

### `PUT /api/paystubs/[id]` — Update pay stub
- Only if status='draft'
- Recalculate totals
- Update YTD values

### `DELETE /api/paystubs/[id]` — Delete pay stub
- Requires auth + ownership check
- Also delete associated PDF from storage if exists

### `POST /api/paystubs/[id]/pdf` — Generate PDF
- Takes the paystub data and generates a professional PDF
- Store in Supabase Storage (bucket: `paystubs` or reuse `documents`)
- Update `pdf_storage_path` and `pdf_generated_at`
- Return a download URL

---

## PDF Generation

**Approach:** Generate PDFs server-side using a library. Options:
1. **@react-pdf/renderer** — React components → PDF (good for complex layouts)
2. **pdfkit** — Programmatic PDF generation (simpler, fewer dependencies)
3. **puppeteer/playwright** — Render HTML → PDF (heaviest, best output, but large dependency)

**Recommendation:** Use `@react-pdf/renderer`. It produces professional output, works well with Next.js API routes, and the component-based approach is easy for agents to build and modify.

**Install:** `npm install @react-pdf/renderer`

### PDF Layout

The pay stub PDF should look like a standard US pay stub:

```
┌─────────────────────────────────────────────────┐
│  [COMPANY LOGO]                                 │
│  Company Name                                   │
│  Company Address                                │
│  Company Phone        EIN: XX-XXXXXXX           │
├─────────────────────────────────────────────────┤
│  EMPLOYEE                   PAY PERIOD           │
│  Employee Name              MM/DD/YYYY -         │
│  Employee Address           MM/DD/YYYY           │
│  Employee ID: XXXX          Pay Date: MM/DD/YYYY │
│  SSN: ***-**-1234           Frequency: Bi-Weekly │
│  Pay Method: Direct Deposit                      │
├─────────────────────────────────────────────────┤
│  EARNINGS                                        │
│  ─────────────────────────────────────────────── │
│  Description      Hours    Rate     Current  YTD │
│  Regular Pay      80.00   $25.00  $2,000   $24k │
│  Overtime         10.00   $37.50    $375    $3k  │
│  ─────────────────────────────────────────────── │
│  GROSS PAY                        $2,375  $27k   │
├─────────────────────────────────────────────────┤
│  DEDUCTIONS                                      │
│  ─────────────────────────────────────────────── │
│  Description              Current         YTD    │
│  Federal Income Tax        $356          $4.2k   │
│  State Income Tax          $119          $1.4k   │
│  Social Security           $147          $1.7k   │
│  Medicare                   $34           $400   │
│  ─────────────────────────────────────────────── │
│  TOTAL DEDUCTIONS          $656          $7.7k   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐ │
│  │  NET PAY              $1,719.00             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  YTD Summary: Gross $27,000 | Deductions $7,700  │
│               Net $19,300                         │
└─────────────────────────────────────────────────┘
```

**Design notes:**
- Letter size (8.5" x 11")
- Professional black/gray color scheme (no bright colors)
- Company logo if uploaded, otherwise just text
- Clear section separators
- Net pay prominently displayed in a box
- All currency formatted with commas and 2 decimal places

### Free Tier Watermark

If the user is on the free tier (no active subscription), add a diagonal watermark across the PDF:
- Text: "SAMPLE — Generated by ToolSuite"
- Color: light gray, semi-transparent
- 45-degree angle across the center
- This creates urgency to subscribe while still showing the product works

---

## Components

```
components/paystubs/
├── PayStubForm.tsx            # Main form with all sections
├── EarningsSection.tsx        # Dynamic earnings line items
├── DeductionsSection.tsx      # Dynamic deduction line items
├── PayStubPreview.tsx         # Live preview (right column)
├── PayStubList.tsx            # Table of past pay stubs
├── PayStubCard.tsx            # Individual pay stub in list
├── ContactAutocomplete.tsx    # Employee name autocomplete from contacts table
└── TotalsDisplay.tsx          # Calculated totals (gross, deductions, net, YTD)
```

---

## Entitlement Check

Before allowing pay stub creation, check that the user has access:

```typescript
// lib/entitlements.ts
export async function canAccessTool(userId: string, toolSlug: string, supabase: any): Promise<boolean> {
  // Check 1: Active subscription?
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, price_id')
    .eq('id', userId)
    .single()
  
  if (!profile || profile.subscription_status !== 'active') {
    // Allow free tier (1 watermarked pay stub)
    const { count } = await supabase
      .from('paystubs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    return (count || 0) < 1  // Free tier: 1 pay stub
  }
  
  // Check 2: Bundle subscriber gets everything
  if (profile.price_id === process.env.NEXT_PUBLIC_STRIPE_PRICE_BUNDLE) {
    return true
  }
  
  // Check 3: Single tool subscriber — check tool_access
  const { data: access } = await supabase
    .from('tool_access')
    .select('is_active')
    .eq('user_id', userId)
    .eq('tool_slug', toolSlug)
    .single()
  
  return access?.is_active === true
}
```

---

## YTD Calculation Logic

When creating or updating a pay stub, calculate YTD values:

```typescript
async function calculateYTD(userId: string, employeeName: string, year: number, supabase: any) {
  const { data: existingStubs } = await supabase
    .from('paystubs')
    .select('gross_pay, total_deductions, net_pay')
    .eq('user_id', userId)
    .eq('employee_name', employeeName)
    .gte('pay_date', `${year}-01-01`)
    .lte('pay_date', `${year}-12-31`)
    .eq('status', 'final')
  
  const ytd_gross = (existingStubs || []).reduce((sum, s) => sum + Number(s.gross_pay), 0)
  const ytd_deductions = (existingStubs || []).reduce((sum, s) => sum + Number(s.total_deductions), 0)
  const ytd_net = (existingStubs || []).reduce((sum, s) => sum + Number(s.net_pay), 0)
  
  return { ytd_gross, ytd_deductions, ytd_net }
}
```

---

## Sidebar Integration

Add "Pay Stubs" to the platform sidebar navigation created in FOUNDATION_SPEC.md:

```typescript
// In the ToolSwitcher or Sidebar component:
const tools = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
  { name: 'Receipts', href: '/receipts', icon: Receipt, active: true },
  { name: 'Pay Stubs', href: '/paystubs', icon: FileText, active: true },  // NEW
  { name: 'Invoices', href: '/invoices', icon: FileSpreadsheet, active: false, comingSoon: true },
  { name: 'Expenses', href: '/expenses', icon: CreditCard, active: false, comingSoon: true },
]
```

---

## Implementation Order

1. Run the `paystubs` table SQL in Supabase
2. Install `@react-pdf/renderer` (`npm install @react-pdf/renderer`)
3. Create the API routes (`/api/paystubs/` CRUD + PDF generation)
4. Create the `lib/entitlements.ts` utility
5. Build the form components (start with `PayStubForm.tsx`)
6. Build the live preview component (`PayStubPreview.tsx`)
7. Build the PDF template (React PDF component)
8. Build the list page (`/paystubs/page.tsx`)
9. Build the create page (`/paystubs/create/page.tsx`)
10. Build the view page (`/paystubs/[id]/page.tsx`)
11. Add "Pay Stubs" to the sidebar navigation
12. Test: create a pay stub → preview → generate PDF → download → verify list page
13. Test: free tier watermark works when no subscription
14. Test: YTD calculations are correct across multiple pay stubs

---

## Success Criteria

- [ ] User can create a pay stub by filling out the form
- [ ] Live preview updates as user types
- [ ] PDF generates with professional layout
- [ ] PDF downloads correctly
- [ ] Pay stubs are saved and appear in the list
- [ ] YTD calculations are accurate
- [ ] Employee autocomplete works from contacts table
- [ ] New employees are auto-added to contacts
- [ ] Company info auto-fills from profile
- [ ] Free tier allows 1 watermarked pay stub
- [ ] Paid users get unlimited pay stubs without watermark
- [ ] Mobile responsive form works
- [ ] Dark mode works
- [ ] Existing ReceiptsFlow functionality is unaffected

---

## Notes for Tom

- This spec is designed to be implementable **without** any changes to ReceiptsFlow's existing code. It only ADDS new files.
- The PDF generation is the trickiest part. If `@react-pdf/renderer` gives you trouble in the Vercel serverless environment, fall back to `pdfkit` (simpler but less pretty) or generate the PDF client-side.
- The JSONB columns for `earnings` and `deductions` are intentional — they're flexible and avoid needing separate tables for line items. This is the same pattern used in ReceiptsFlow's `extracted_data` column.
- Keep the UI consistent with ReceiptsFlow's existing aesthetic. Same Tailwind classes, same dark mode, same component patterns.
- Commit frequently. Don't try to build the entire thing in one commit.
