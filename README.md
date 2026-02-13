# ReceiptFlow - AI Receipt/Invoice Extraction

Extract data from receipts and invoices automatically using AI.

## Features

- 📄 Upload PDF or image files
- 🤖 AI-powered data extraction
- 📊 View results in organized table
- 📥 Export to CSV
- 🔐 Simple email-based auth

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase (database & auth)
- OpenAI GPT-4o-mini (extraction)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your credentials:
   - Supabase URL and anon key
   - OpenAI API key
3. Run `npm install`
4. Run `npm run dev`

## Database Schema

See `supabase/schema.sql` for the database setup.

## Usage

1. Sign up with email
2. Upload receipt/invoice (PDF or image)
3. AI extracts: vendor, date, amount, line items
4. Review and export to CSV

## Pricing

$29/month for unlimited extractions

## License

MIT
