# EXPENSE TRACKER — Tool Module Spec

**Spec Version:** 1.0
**Date:** 2026-02-16
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Recommended Model:** Sonnet for all work.
**Prerequisite:** FOUNDATION_SPEC.md must be completed. ReceiptsFlow should be working at /receipts.

---

## Overview

The Expense Tracker lets users log, categorize, and analyze business expenses. Its killer feature is **auto-import from ReceiptsFlow** — when a receipt is scanned, the expense is auto-created from the extracted data. This is the first real cross-tool integration and demonstrates the platform's value.

**Target user:** Freelancers, self-employed, small business owners tracking expenses for tax deductions.
**Key differentiator:** AI auto-categorization + direct integration with ReceiptsFlow receipts.

---

## User Flow

```
1. User navigates to /expenses from sidebar
2. Sees expense list with running totals and category breakdown
3. Can add expense manually OR expenses auto-appear from ReceiptsFlow
4. Each expense has: vendor, amount, date, category, receipt (linked)
5. AI auto-suggests category based on vendor name
6. Monthly/yearly summary with category breakdown chart
7. Export to CSV for tax preparation
```

---

## Pages & Routes

```
app/(platform)/expenses/
├── page.tsx                  # Expense list + summary dashboard
├── create/
│   └── page.tsx              # Manual expense entry form
├── [id]/
│   └── page.tsx              # View/edit individual expense
├── categories/
│   └── page.tsx              # Manage custom categories
```

---

## Database Schema

### New Table: `expenses`

```sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Core fields
  vendor TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  expense_date DATE NOT NULL,
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'uncategorized',
  subcategory TEXT,
  is_tax_deductible BOOLEAN DEFAULT false,
  tax_category TEXT,  -- IRS categories: 'advertising', 'car_expenses', 'office', etc.
  
  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'receipt_scan', 'bank_import')),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,  -- Link to ReceiptsFlow receipt
  
  -- Contact (optional — for vendor tracking)
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'other')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'archived')),
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expenses"
  ON expenses FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_vendor ON expenses(vendor);
CREATE INDEX idx_expenses_document_id ON expenses(document_id);
CREATE INDEX idx_expenses_source ON expenses(source);
```

### New Table: `expense_categories`
Custom categories per user.

```sql
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,  -- emoji or lucide icon name
  color TEXT,  -- hex color for charts
  is_tax_deductible BOOLEAN DEFAULT false,
  tax_category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, name)
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own categories"
  ON expense_categories FOR ALL USING (auth.uid() = user_id);

-- Seed default categories for new users (trigger)
CREATE OR REPLACE FUNCTION seed_expense_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO expense_categories (user_id, name, icon, color, is_tax_deductible, tax_category, sort_order) VALUES
    (NEW.id, 'Advertising', '📢', '#8B5CF6', true, 'advertising', 1),
    (NEW.id, 'Office Supplies', '📎', '#60A5FA', true, 'office', 2),
    (NEW.id, 'Software & Tools', '💻', '#34D399', true, 'office', 3),
    (NEW.id, 'Travel', '✈️', '#F97316', true, 'travel', 4),
    (NEW.id, 'Meals & Entertainment', '🍽️', '#EC4899', true, 'meals', 5),
    (NEW.id, 'Vehicle', '🚗', '#EAB308', true, 'car_expenses', 6),
    (NEW.id, 'Professional Services', '👔', '#14B8A6', true, 'legal_professional', 7),
    (NEW.id, 'Insurance', '🛡️', '#6366F1', true, 'insurance', 8),
    (NEW.id, 'Rent & Utilities', '🏢', '#F43F5E', true, 'rent', 9),
    (NEW.id, 'Other', '📦', '#94A3B8', false, NULL, 99);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_seed_categories
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION seed_expense_categories();
```

---

## ReceiptsFlow Integration (Key Feature)

This is the first cross-tool integration. When a receipt is processed in ReceiptsFlow, an expense should auto-create.

### Approach: Database trigger on `documents` table

```sql
-- When a document is marked as 'completed' in ReceiptsFlow, auto-create an expense
CREATE OR REPLACE FUNCTION auto_create_expense_from_receipt()
RETURNS TRIGGER AS $$
DECLARE
  extracted JSONB;
  vendor_name TEXT;
  total_amount DECIMAL;
  doc_date DATE;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    extracted := NEW.extracted_data;
    
    -- Extract fields from the JSONB data
    vendor_name := COALESCE(extracted->>'vendor', extracted->>'merchant', 'Unknown Vendor');
    total_amount := COALESCE((extracted->>'total')::DECIMAL, (extracted->>'amount')::DECIMAL, 0);
    doc_date := COALESCE((extracted->>'date')::DATE, CURRENT_DATE);
    
    -- Only create if we have a meaningful amount
    IF total_amount > 0 THEN
      INSERT INTO expenses (user_id, vendor, amount, expense_date, source, document_id, status, category)
      VALUES (
        NEW.user_id,
        vendor_name,
        total_amount,
        doc_date,
        'receipt_scan',
        NEW.id,
        'pending',  -- pending = needs category confirmation from user
        'uncategorized'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_document_completed_create_expense
  AFTER UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION auto_create_expense_from_receipt();
```

**This means:** User scans a receipt in ReceiptsFlow → expense auto-appears in Expense Tracker with vendor, amount, date pre-filled from AI extraction → user just confirms category and marks as confirmed. That's the magic moment.

---

## AI Auto-Categorization

When an expense is created (either manually or from receipt), suggest a category based on the vendor name:

### `/api/expenses/categorize` — Categorize endpoint

```typescript
// Simple rule-based categorization (no AI API needed for V1)
const VENDOR_CATEGORY_MAP: Record<string, string> = {
  // Software
  'github': 'Software & Tools',
  'vercel': 'Software & Tools',
  'aws': 'Software & Tools',
  'google cloud': 'Software & Tools',
  'figma': 'Software & Tools',
  'slack': 'Software & Tools',
  'zoom': 'Software & Tools',
  'notion': 'Software & Tools',
  'adobe': 'Software & Tools',
  
  // Office
  'staples': 'Office Supplies',
  'office depot': 'Office Supplies',
  'amazon': 'Office Supplies',  // default, user can recategorize
  
  // Travel
  'uber': 'Travel',
  'lyft': 'Travel',
  'airlines': 'Travel',
  'hotel': 'Travel',
  'airbnb': 'Travel',
  
  // Meals
  'restaurant': 'Meals & Entertainment',
  'doordash': 'Meals & Entertainment',
  'grubhub': 'Meals & Entertainment',
  'starbucks': 'Meals & Entertainment',
  
  // Gas/Vehicle
  'shell': 'Vehicle',
  'chevron': 'Vehicle',
  'exxon': 'Vehicle',
  'bp': 'Vehicle',
  
  // Advertising
  'meta ads': 'Advertising',
  'google ads': 'Advertising',
  'facebook': 'Advertising',
};

function suggestCategory(vendor: string): string {
  const lower = vendor.toLowerCase();
  for (const [keyword, category] of Object.entries(VENDOR_CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return 'uncategorized';
}
```

For V2, this can be enhanced with Haiku to categorize unknown vendors — but the rule-based approach handles 80% of cases and costs $0.

---

## API Routes

### `POST /api/expenses` — Create expense manually
### `GET /api/expenses` — List expenses with filters
- Filters: `?category=x`, `?from=date`, `?to=date`, `?vendor=x`, `?source=x`
- Returns with summary: total amount, count, by-category breakdown

### `GET /api/expenses/[id]` — Get single expense
### `PUT /api/expenses/[id]` — Update expense (category, notes, etc.)
### `DELETE /api/expenses/[id]` — Delete expense

### `GET /api/expenses/summary` — Summary stats
- Total expenses this month / this year
- By-category breakdown (for charts)
- Month-over-month comparison
- Tax-deductible total

### `GET /api/expenses/export` — Export to CSV
- Filtered by date range
- Columns: Date, Vendor, Description, Category, Amount, Tax Deductible, Payment Method

### `GET /api/expenses/categories` — Get user's categories
### `POST /api/expenses/categories` — Create custom category
### `PUT /api/expenses/categories/[id]` — Update category
### `DELETE /api/expenses/categories/[id]` — Delete category (reassign expenses to 'Other')

---

## Expense List Page Features

**Top section — Summary cards:**
- Total This Month: $X,XXX
- Total This Year: $X,XXX
- Tax Deductible: $X,XXX
- Pending Review: X expenses (from receipt scans needing categorization)

**Filters bar:**
- Date range picker (this month, last month, this quarter, this year, custom)
- Category dropdown
- Source filter (All, Manual, Receipt Scan)
- Search by vendor name

**Table columns:** Date, Vendor, Category (color badge), Amount, Source (icon: manual/receipt), Status, Actions

**Highlight:** Expenses from ReceiptsFlow receipts should show a small receipt icon linking back to the original document. This visual connection reinforces the platform value.

**Category breakdown chart:**
- Simple donut or bar chart showing spending by category
- Use Recharts (already could be available) or a simple CSS-based chart
- Shows for the selected date range

---

## Components

```
components/expenses/
├── ExpenseForm.tsx            # Manual expense entry
├── ExpenseList.tsx            # Table with filters
├── ExpenseSummaryCards.tsx     # Top summary stats
├── CategoryBreakdown.tsx      # Donut/bar chart
├── CategoryBadge.tsx          # Colored category pill
├── CategoryManager.tsx        # Custom category CRUD
├── ReceiptLink.tsx            # Link back to ReceiptsFlow document
├── DateRangePicker.tsx        # Date range filter
└── ExpenseExportButton.tsx    # CSV export trigger
```

---

## Sidebar Integration

```typescript
{ name: 'Expenses', href: '/expenses', icon: CreditCard, active: true }
```

---

## Implementation Order

1. Run SQL for `expenses` + `expense_categories` tables + triggers
2. Create the auto-create trigger on the `documents` table
3. Build API routes (CRUD + summary + export + categories)
4. Build the categorization utility (rule-based)
5. Build expense list page with summary cards and filters
6. Build manual expense creation form
7. Build expense detail/edit page
8. Build category breakdown chart
9. Build category management page
10. Build CSV export
11. Add to sidebar
12. Test: scan receipt in ReceiptsFlow → verify expense auto-creates → categorize → export CSV
13. Test: manual expense creation flow
14. Test: monthly/yearly summary stats

---

## Success Criteria

- [ ] Expenses auto-create from ReceiptsFlow receipt scans (the key integration)
- [ ] Manual expense creation works
- [ ] AI/rule-based category suggestions work
- [ ] Category breakdown chart renders correctly
- [ ] Monthly and yearly summary stats are accurate
- [ ] Tax-deductible total is calculated correctly
- [ ] CSV export works with date range filtering
- [ ] Custom categories can be created/edited/deleted
- [ ] Receipt link back to ReceiptsFlow document works
- [ ] Pending review badge shows for uncategorized receipt-sourced expenses
- [ ] Mobile responsive
- [ ] Dark mode works

---

## Notes for Tom

- The database trigger on the `documents` table is the most important part. Test it thoroughly — it's the first real cross-tool connection in the platform.
- The `extracted_data` JSONB field in ReceiptsFlow's documents table may have varying key names (vendor vs merchant, total vs amount). The trigger handles this with COALESCE but check actual data from a few real receipts to verify.
- The rule-based categorization is intentionally simple. Don't overthink it — cover the top 30 vendors and default to 'uncategorized' for everything else. Users will set their own categories over time.
- The expense categories seeding trigger fires on profile creation. For existing users (Ryan), manually run the seed INSERT with his user_id.
- For the chart, a simple CSS-based horizontal bar chart is fine for V1. Don't add Recharts as a dependency unless it's already installed.
- CSV export should be a server-side API route that streams the file, not client-side generation. This handles large datasets better.
