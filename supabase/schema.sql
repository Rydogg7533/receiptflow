# Supabase Schema for ReceiptFlow

## Tables

### documents
Stores uploaded documents and their extraction status.

```sql
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
  -- Internal-only (do not expose to client): conversion telemetry
  conversion_provider text,
  pages_converted integer,
  converted_at timestamp with time zone,
  conversion_job_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table documents enable row level security;

-- Policies
create policy "Users can only access their own documents"
  on documents for all
  using (auth.uid() = user_id);

-- Indexes
create index idx_documents_user_id on documents(user_id);
create index idx_documents_status on documents(status);
create index idx_documents_created_at on documents(created_at desc);
```

### google_connections
Stores per-user Google OAuth tokens for Sheets export.

```sql
create table google_connections (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  token_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table google_connections enable row level security;

create policy "Users can manage their google connection"
  on google_connections for all
  using (auth.uid() = user_id);
```

### profiles
Stores user subscription and billing information.

```sql
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
alter table profiles enable row level security;

-- Policies
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
```

### Storage Bucket
Create a bucket named `documents` with the following policy:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
