# ReceiptFlow Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd ~/workspace/receiptflow
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Project Settings → API
3. Copy the `URL` and `anon public` key
4. Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Database

In your Supabase SQL Editor, run the complete schema from `supabase/schema.sql`:

```sql
-- Documents table
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  extracted_data jsonb,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Profiles table (for subscriptions)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  price_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table documents enable row level security;
alter table profiles enable row level security;

-- Policies
create policy "Users can only access their own documents"
  on documents for all
  using (auth.uid() = user_id);

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes
create index idx_documents_user_id on documents(user_id);
create index idx_documents_status on documents(status);
create index idx_documents_created_at on documents(created_at desc);
```

### 4. Set Up Storage Bucket

1. In Supabase, go to Storage
2. Create a new bucket called `documents`
3. Set it to **Private**
4. Add these policies:

**Upload policy:**
```sql
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Read policy:**
```sql
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Delete policy:**
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5. Set Up Auth

1. In Supabase, go to Authentication → Providers
2. Enable **Email** provider
3. Disable "Confirm email" (for magic links) or keep it enabled if you want double opt-in
4. Make sure "Enable Signup" is checked

### 6. Set Up OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add it to your `.env.local` file

### 7. Set Up Stripe

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Dashboard
3. Create a product:
   - Go to Products → Add Product
   - Name: "ReceiptFlow Pro"
   - Price: $29/month recurring
4. Copy the Price ID (starts with `price_`) to your `.env.local`
5. Set up webhook for local testing:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhook
   ```
6. Copy the webhook signing secret to `.env.local`

### 8. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Important: Update Auth Callback URL

In Supabase Auth settings, add your production callback URL:
- `https://yourdomain.com/auth/callback`

### Set Up Production Stripe Webhook

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the webhook signing secret to Vercel env vars

## Pricing

**Cost per extraction:**
- GPT-4o-mini: ~$0.0002 per receipt
- At $29/month per user with 100 receipts: **99.9% margin**

## Test Card

Use Stripe test card for testing:
- Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

## Next Steps

1. ✅ Test with real receipts
2. ✅ Stripe payments integrated
3. Add QuickBooks integration
4. Create landing page & marketing
5. Build agent system for finding opportunities

## Support

Need help? Check the main README.md or create an issue.
