# INVOICE GENERATOR — Tool Module Spec

**Spec Version:** 1.0
**Date:** 2026-02-16
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Recommended Model:** Sonnet. Opus only if Stripe integration gets complex.
**Prerequisite:** FOUNDATION_SPEC.md must be completed first.

---

## Overview

The Invoice Generator lets users create professional invoices, send them to clients, and track payment status. It's the highest cross-sell tool in the platform — it touches contacts (shared), generates transactions (shared), and naturally leads users to Expense Tracker and P&L Dashboard.

**Target user:** Freelancers, consultants, small service businesses
**Key differentiator:** AI auto-fills line items from previous invoices for the same client. One-click invoice creation for repeat clients.

---

## User Flow

```
1. User navigates to /invoices from sidebar
2. Sees list of invoices with status (Draft, Sent, Paid, Overdue)
3. Clicks "Create Invoice"
4. Selects or creates a client (from shared contacts)
5. Adds line items (description, qty, rate, amount)
6. Sets payment terms, due date, notes
7. Previews the invoice
8. Clicks "Send" → generates PDF, emails to client (or downloads)
9. Invoice status tracked: Sent → Viewed → Paid
10. Dashboard shows total outstanding, total paid this month
```

---

## Pages & Routes

```
app/(platform)/invoices/
├── page.tsx                  # Invoice list with filters
├── create/
│   └── page.tsx              # Create invoice form
├── [id]/
│   ├── page.tsx              # View invoice detail
│   └── edit/
│       └── page.tsx          # Edit draft invoice
```

---

## Database Schema

### New Table: `invoices`

```sql
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Invoice identifiers
  invoice_number TEXT NOT NULL,  -- Auto-generated: INV-0001, INV-0002, etc.
  
  -- Company info (snapshot)
  from_name TEXT NOT NULL,
  from_email TEXT,
  from_address TEXT,
  from_phone TEXT,
  from_logo_url TEXT,
  
  -- Client info (snapshot)
  to_name TEXT NOT NULL,
  to_email TEXT,
  to_address TEXT,
  to_company TEXT,
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_terms TEXT DEFAULT 'net_30' CHECK (payment_terms IN ('due_on_receipt', 'net_15', 'net_30', 'net_60', 'custom')),
  
  -- Line items (JSONB array)
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"description": "Web Design", "quantity": 10, "rate": 150.00, "amount": 1500.00}]
  
  -- Financials
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  
  -- Notes
  notes TEXT,  -- Displayed on invoice (e.g., "Thank you for your business!")
  internal_notes TEXT,  -- Private notes not shown to client
  
  -- Payment tracking
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_method TEXT,
  
  -- PDF
  pdf_storage_path TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Email tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to_email TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invoices"
  ON invoices FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Auto-increment invoice numbers per user
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE user_id = p_user_id;
  
  RETURN 'INV-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## API Routes

### `POST /api/invoices` — Create invoice
- Auto-generate invoice_number using the function
- Calculate subtotal, tax, total, amount_due
- Create/link contact if needed
- Return created invoice

### `GET /api/invoices` — List invoices
- Auth required
- Supports filters: `?status=sent`, `?client=name`
- Returns ordered by created_at DESC
- Include summary stats: total_outstanding, total_paid_month, count_overdue

### `GET /api/invoices/[id]` — Get single invoice

### `PUT /api/invoices/[id]` — Update invoice
- Only drafts can be fully edited
- Sent invoices can only update: status, amount_paid, paid_at, internal_notes

### `DELETE /api/invoices/[id]` — Delete invoice
- Only drafts can be deleted. Sent invoices can only be cancelled.

### `POST /api/invoices/[id]/pdf` — Generate PDF
- Professional invoice PDF layout
- Store in Supabase Storage
- Return download URL

### `POST /api/invoices/[id]/send` — Send invoice
- Generate PDF if not already generated
- For V1: just generate a mailto: link with the PDF attached or provide a "copy link" shareable URL
- Update status to 'sent', record sent_at
- FUTURE: actual email sending via Resend or similar

### `POST /api/invoices/[id]/mark-paid` — Mark as paid
- Update status, amount_paid, paid_at
- Record payment method

### `GET /api/invoices/stats` — Dashboard stats
- Total outstanding (sum of amount_due where status in sent, viewed, overdue)
- Total paid this month
- Count of overdue invoices
- Average days to payment

---

## Invoice PDF Layout

Similar professional style to pay stubs. Standard US invoice format:

```
┌──────────────────────────────────────────────────┐
│  INVOICE                                          │
│                                                    │
│  [Company Logo]              Invoice #: INV-0042   │
│  From Company Name           Date: Feb 16, 2026    │
│  123 Business St             Due: Mar 18, 2026     │
│  City, ST 12345              Terms: Net 30          │
│                                                    │
├──────────────────────────────────────────────────┤
│  BILL TO:                                          │
│  Client Name                                       │
│  Client Company                                    │
│  client@email.com                                  │
│  Client Address                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  Description          Qty    Rate      Amount      │
│  ──────────────────────────────────────────────── │
│  Web Design           10    $150.00   $1,500.00    │
│  Hosting (monthly)     1     $49.00      $49.00    │
│  SSL Certificate       1     $15.00      $15.00    │
│  ──────────────────────────────────────────────── │
│                                                    │
│                           Subtotal:   $1,564.00    │
│                           Tax (8%):     $125.12    │
│                           ─────────────────────    │
│                           TOTAL:      $1,689.12    │
│                           Paid:          $0.00     │
│                           ─────────────────────    │
│                           AMOUNT DUE: $1,689.12    │
│                                                    │
├──────────────────────────────────────────────────┤
│  Notes:                                            │
│  Thank you for your business! Payment due within   │
│  30 days of invoice date.                          │
│                                                    │
│  Pay via: Direct deposit / Check / etc.            │
└──────────────────────────────────────────────────┘
```

---

## AI Feature: Smart Line Items

When creating an invoice for an existing contact, query previous invoices for that contact and offer to auto-fill line items:

```typescript
// When user selects a contact, fetch their previous line items
const { data: previousInvoices } = await supabase
  .from('invoices')
  .select('line_items')
  .eq('user_id', userId)
  .eq('contact_id', contactId)
  .order('created_at', { ascending: false })
  .limit(3);

// Extract unique line items as suggestions
const suggestions = extractUniqueLineItems(previousInvoices);
// Show as "Quick add" buttons above the line items form
```

This is a small feature but a big UX differentiator. "Oh it remembers what I charge this client" → sticky product.

---

## Invoice List Page Features

**Status tabs:** All | Draft | Sent | Paid | Overdue
**Summary cards at top:**
- Total Outstanding: $X,XXX
- Paid This Month: $X,XXX  
- Overdue: X invoices

**Table columns:** Invoice #, Client, Amount, Status (color badge), Due Date, Actions
**Status badges:** Draft (gray), Sent (blue), Viewed (yellow), Paid (green), Overdue (red), Cancelled (gray strikethrough)

---

## Sidebar Integration

Add to the platform sidebar:
```typescript
{ name: 'Invoices', href: '/invoices', icon: FileSpreadsheet, active: true }
```

---

## Implementation Order

1. Run SQL for `invoices` table + invoice number function
2. Create API routes (CRUD + PDF + send + mark-paid + stats)
3. Build form components (line items editor, client picker, date/terms)
4. Build invoice list page with status filters and summary cards
5. Build create page (form + live preview)
6. Build view page (read-only invoice display + actions)
7. Build PDF generation (same approach as pay stubs, `@react-pdf/renderer`)
8. Implement smart line item suggestions
9. Add to sidebar
10. Test full flow: create → preview → generate PDF → send → mark paid

---

## Success Criteria

- [ ] User can create invoices with multiple line items
- [ ] Auto-incrementing invoice numbers (INV-0001, INV-0002)
- [ ] Tax and total calculations are accurate
- [ ] Professional PDF generation
- [ ] Invoice list with status filtering
- [ ] Mark as paid functionality
- [ ] Client autocomplete from shared contacts
- [ ] Smart line item suggestions from previous invoices
- [ ] Summary stats (outstanding, paid this month, overdue count)
- [ ] Mobile responsive
- [ ] Dark mode works

---

## Notes for Tom

- Invoice numbers must be unique per user and auto-incrementing. The SQL function handles this — call it when creating new invoices.
- For V1, "sending" an invoice just means generating the PDF and giving the user a download link or mailto: link. Actual email delivery (Resend, SendGrid) is V2.
- The JSONB line_items approach is the same pattern used in pay stubs — keeps things simple and avoids a separate table.
- The viewed_at tracking is FUTURE — requires a public invoice viewing page with a tracking pixel. Skip for V1.
- Reuse the same PDF generation pattern from pay stubs. The `@react-pdf/renderer` package should already be installed.
