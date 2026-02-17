# SEO CONTENT PIPELINE — Haiku-Powered Automated Content System

**Spec Version:** 1.0
**Date:** 2026-02-16
**Author:** Ryan (via Claude Architect)
**Executor:** Tom (OpenClaw)
**Model:** Haiku for content generation. Sonnet for the pipeline code itself.

---

## Overview

This is NOT a tool for users. This is an internal system that automatically generates SEO blog content for the ToolSuite marketing site. It runs on a schedule, generates draft blog posts using Claude Haiku (cheap), saves them for Ryan to review, and publishes approved posts to the blog.

**Goal:** 3+ blog posts per week, targeting long-tail keywords that drive organic traffic to your tools. SEO content takes 3-6 months to rank, so every week you delay is a week added to that timeline.

**Monthly cost:** ~$10-20 in Haiku API tokens for 12-15 posts/month.

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Keyword Queue   │────▶│  Haiku API   │────▶│  content_drafts │
│  (Supabase)      │     │  (generate)  │     │  (Supabase)     │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  /admin/content  │
                                              │  (review UI)     │
                                              └────────┬────────┘
                                                       │
                                              Ryan approves/edits
                                                       │
                                              ┌────────▼────────┐
                                              │  /blog/[slug]    │
                                              │  (published)     │
                                              └─────────────────┘
```

---

## Database Tables

### `seo_keywords`
Queue of target keywords to write about.

```sql
CREATE TABLE seo_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  search_intent TEXT CHECK (search_intent IN ('informational', 'transactional', 'comparison', 'how_to')),
  target_tool TEXT,  -- which tool this keyword drives traffic to
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'drafted', 'published', 'skipped')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### `content_drafts`
Generated blog post drafts.

```sql
CREATE TABLE content_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES seo_keywords(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT,
  content TEXT NOT NULL,  -- Markdown format
  word_count INTEGER,
  target_tool TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'rejected')),
  model_used TEXT DEFAULT 'haiku',
  generation_cost_tokens INTEGER,
  ryan_notes TEXT,  -- Ryan's edit notes
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### `blog_posts`
Published posts (public-facing).

```sql
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID REFERENCES content_drafts(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT,
  content TEXT NOT NULL,  -- Markdown
  featured_image_url TEXT,
  target_tool TEXT,
  tags TEXT[] DEFAULT '{}',
  word_count INTEGER,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

No RLS needed on these tables — they're admin-only (seo_keywords, content_drafts) or public-read (blog_posts).

---

## Seed Keywords

Pre-populate `seo_keywords` with these starter keywords. These are chosen for: low competition, high intent, and direct relevance to your tools.

### Pay Stub Keywords (Transactional — highest priority)
```sql
INSERT INTO seo_keywords (keyword, search_intent, target_tool, priority) VALUES
('free pay stub generator', 'transactional', 'paystubs', 1),
('pay stub template', 'transactional', 'paystubs', 1),
('how to make a pay stub', 'how_to', 'paystubs', 2),
('pay stub generator for small business', 'transactional', 'paystubs', 2),
('create pay stub online free', 'transactional', 'paystubs', 1),
('pay stub for self employed', 'transactional', 'paystubs', 2),
('proof of income pay stub', 'informational', 'paystubs', 3),
('pay stub vs paycheck', 'informational', 'paystubs', 5),
('what information is on a pay stub', 'informational', 'paystubs', 4),
('how to read a pay stub', 'informational', 'paystubs', 4);
```

### Receipt / Document Keywords
```sql
INSERT INTO seo_keywords (keyword, search_intent, target_tool, priority) VALUES
('receipt scanner app for business', 'transactional', 'receipts', 1),
('ai receipt scanner', 'transactional', 'receipts', 2),
('best receipt organizer for small business', 'comparison', 'receipts', 2),
('how to organize business receipts', 'how_to', 'receipts', 3),
('receipt scanner vs manual entry', 'comparison', 'receipts', 3),
('digital receipt management', 'informational', 'receipts', 4),
('scan receipts for taxes', 'how_to', 'receipts', 2),
('receipt tracking for freelancers', 'transactional', 'receipts', 2),
('expense receipt app', 'transactional', 'receipts', 3),
('how long to keep business receipts', 'informational', 'receipts', 4);
```

### Invoice Keywords (for when Invoice Generator launches)
```sql
INSERT INTO seo_keywords (keyword, search_intent, target_tool, priority) VALUES
('free invoice generator', 'transactional', 'invoices', 1),
('invoice template for freelancers', 'transactional', 'invoices', 1),
('how to create a professional invoice', 'how_to', 'invoices', 2),
('invoice generator small business', 'transactional', 'invoices', 2),
('best free invoicing tool', 'comparison', 'invoices', 2),
('invoice vs receipt difference', 'informational', 'invoices', 4),
('how to send an invoice', 'how_to', 'invoices', 3),
('freelance invoice template', 'transactional', 'invoices', 2),
('recurring invoice setup', 'how_to', 'invoices', 4),
('invoice payment terms net 30', 'informational', 'invoices', 5);
```

### Expense / Tax Keywords
```sql
INSERT INTO seo_keywords (keyword, search_intent, target_tool, priority) VALUES
('expense tracker for small business', 'transactional', 'expenses', 2),
('how to track business expenses', 'how_to', 'expenses', 2),
('freelance tax deductions list', 'informational', 'expenses', 3),
('quarterly tax calculator freelancer', 'transactional', 'expenses', 3),
('business expense categories', 'informational', 'expenses', 4),
('mileage tracking for taxes', 'how_to', 'expenses', 4),
('home office deduction calculator', 'transactional', 'expenses', 3),
('self employment tax calculator', 'transactional', 'expenses', 2),
('best expense tracking app', 'comparison', 'expenses', 3),
('how to separate personal and business expenses', 'how_to', 'expenses', 4);
```

---

## Content Generation API Route

### `POST /api/admin/generate-content`

This route picks the next keyword from the queue, generates a blog post using Haiku, and saves it as a draft.

```typescript
// app/api/admin/generate-content/route.ts

import Anthropic from '@anthropic-ai/sdk';  // npm install @anthropic-ai/sdk

const SYSTEM_PROMPT = `You are a content writer for ToolSuite, a business tools platform for freelancers and small businesses. 

Your writing style:
- Conversational but professional — like a knowledgeable friend, not a textbook
- Use short paragraphs (2-3 sentences max)
- Include practical, actionable advice
- Use real examples and specific numbers where possible
- Naturally mention ToolSuite's relevant tool 1-2 times (not more — don't be salesy)
- Include a brief CTA at the end inviting readers to try the relevant tool
- Write at an 8th grade reading level — accessible to everyone
- NO fluff, NO filler phrases like "in today's fast-paced world" or "it's important to note"
- NO bullet point lists longer than 5 items
- Use headers (H2, H3) to break up content every 200-300 words

Format: Return ONLY valid markdown. Start with the article content directly (no title — that's separate).
Do not include any preamble like "Here's your article" or wrap in code blocks.`;

export async function POST(request: Request) {
  // AUTH CHECK: Only allow admin/Ryan
  // Simple approach: check against a specific user ID or email
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Get next keyword from queue
  const { data: keyword } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!keyword) {
    return Response.json({ error: 'No keywords in queue' }, { status: 404 });
  }

  // Mark as in progress
  await supabase
    .from('seo_keywords')
    .update({ status: 'in_progress' })
    .eq('id', keyword.id);

  // Generate content with Haiku
  const intentInstructions = {
    'informational': 'Write an educational, comprehensive guide.',
    'transactional': 'Write content that naturally leads the reader toward trying the tool. Focus on the problem the tool solves.',
    'comparison': 'Write a fair comparison. Mention ToolSuite as one option but be genuine about alternatives.',
    'how_to': 'Write a step-by-step guide with clear, numbered instructions.',
  };

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Write a 1200-1800 word blog post targeting the keyword: "${keyword.keyword}"

Search intent: ${keyword.search_intent}
${intentInstructions[keyword.search_intent] || ''}

Target tool: ${keyword.target_tool || 'general'}

Requirements:
- Naturally include the keyword 3-5 times (not stuffed)
- Include 3-5 H2 headers
- End with a brief, natural CTA mentioning ToolSuite
- Make it genuinely useful — someone should learn something even if they never use our tool`
    }]
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';
  const wordCount = content.split(/\s+/).length;

  // Generate title and meta description
  const metaMessage = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `For a blog post about "${keyword.keyword}", generate:
1. An SEO-optimized title (50-60 characters, includes the keyword naturally)
2. A meta description (150-160 characters, compelling, includes keyword)

Return as JSON only: {"title": "...", "meta_description": "..."}`
    }]
  });

  const metaText = metaMessage.content[0].type === 'text' ? metaMessage.content[0].text : '{}';
  const meta = JSON.parse(metaText.replace(/```json?|```/g, '').trim());

  // Create slug from title
  const slug = meta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Save draft
  const { data: draft } = await supabase
    .from('content_drafts')
    .insert({
      keyword_id: keyword.id,
      title: meta.title,
      slug,
      meta_description: meta.meta_description,
      content,
      word_count: wordCount,
      target_tool: keyword.target_tool,
      status: 'review',
      model_used: 'haiku',
      generation_cost_tokens: message.usage.input_tokens + message.usage.output_tokens,
    })
    .select()
    .single();

  // Update keyword status
  await supabase
    .from('seo_keywords')
    .update({ status: 'drafted' })
    .eq('id', keyword.id);

  return Response.json({ draft });
}
```

**Required env variable:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Install:** `npm install @anthropic-ai/sdk`

---

## Cron Job: Auto-Generate Content

Use Vercel Cron to trigger content generation automatically.

### `vercel.json` (add to project root)
```json
{
  "crons": [
    {
      "path": "/api/admin/cron/generate-content",
      "schedule": "0 9 * * 1,3,5"
    }
  ]
}
```

This runs Monday, Wednesday, Friday at 9 AM UTC — generating 3 posts per week.

### `app/api/admin/cron/generate-content/route.ts`
```typescript
export async function GET(request: Request) {
  // Verify this is a Vercel cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Call the content generation endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/generate-content`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET}` }
  });

  const result = await response.json();
  return Response.json({ success: true, result });
}
```

**New env variables:**
```
CRON_SECRET=your-random-secret-string
ADMIN_SECRET=your-admin-secret-string
```

---

## Admin Content Review UI

### `/admin/content` — Content Dashboard

**This is an internal page, not user-facing.** Protected by checking Ryan's specific user ID.

```
app/(platform)/admin/
├── content/
│   ├── page.tsx        # List of drafts with status filters
│   └── [id]/
│       └── page.tsx    # View/edit individual draft
```

**List page features:**
- Filter by status: All, Review, Approved, Published, Rejected
- Each row shows: title, keyword, word count, status, date
- Quick actions: Approve, Reject, Edit, Publish
- Badge showing how many posts are awaiting review

**Individual draft page features:**
- Full markdown preview of the blog post
- Edit the content inline (markdown editor — even a simple textarea works)
- Edit title and meta description
- Ryan's notes field
- Buttons: Approve → Publish, Reject, Save Edits
- "Publish" button → creates entry in `blog_posts`, updates draft status

---

## Blog Frontend

### `/blog` — Blog listing page
```
app/(marketing)/blog/
├── page.tsx            # List of published posts
└── [slug]/
    └── page.tsx        # Individual blog post
```

**Blog listing:**
- Grid or list of published posts
- Shows: title, meta description preview, date, target tool tag
- Sorted by published_at DESC
- Simple, clean design matching the marketing site

**Individual post:**
- Title, published date, estimated read time
- Rendered markdown content
- CTA banner at bottom: "Try [Tool Name] free" → links to relevant tool
- Related posts (same target_tool) at bottom
- Proper meta tags for SEO:
  - `<title>`, `<meta name="description">`, Open Graph tags
  - Canonical URL
  - Schema.org Article markup (structured data)

---

## Blog Post SEO Requirements

Every published blog post MUST have:

```typescript
// In the blog post page's metadata export:
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  return {
    title: post.title,
    description: post.meta_description,
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: 'article',
      publishedTime: post.published_at,
      url: `https://yourdomain.com/blog/${post.slug}`,
    },
    alternates: {
      canonical: `https://yourdomain.com/blog/${post.slug}`,
    },
  };
}
```

Also add a `sitemap.xml` route that includes all published blog posts:

```typescript
// app/sitemap.ts
export default async function sitemap() {
  const posts = await getAllPublishedPosts();
  
  const blogUrls = posts.map(post => ({
    url: `https://yourdomain.com/blog/${post.slug}`,
    lastModified: post.updated_at,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: 'https://yourdomain.com', priority: 1.0 },
    { url: 'https://yourdomain.com/pricing', priority: 0.9 },
    { url: 'https://yourdomain.com/blog', priority: 0.8 },
    ...blogUrls,
  ];
}
```

---

## Implementation Order

1. Run the SQL for `seo_keywords`, `content_drafts`, `blog_posts` tables
2. Seed the keywords (run the INSERT statements above)
3. `npm install @anthropic-ai/sdk`
4. Create `/api/admin/generate-content` route
5. Create `/api/admin/cron/generate-content` route
6. Add `vercel.json` with cron config
7. Build `/admin/content` review UI (list + detail pages)
8. Build `/blog` frontend (list + individual post)
9. Add sitemap.ts
10. Test: manually trigger content generation → review → publish → verify blog post renders
11. Deploy and let cron run automatically

---

## Success Criteria

- [ ] Haiku generates blog post drafts from keyword queue
- [ ] Drafts are saved to Supabase with proper metadata
- [ ] Admin UI shows drafts for review
- [ ] Ryan can edit, approve, and publish from the UI
- [ ] Published posts render at /blog/[slug] with proper SEO meta
- [ ] Sitemap includes all published posts
- [ ] Cron job triggers MWF automatically
- [ ] Cost per post stays under $0.05 (Haiku pricing)

---

## Notes for Tom

- The ANTHROPIC_API_KEY is separate from the OPENAI_API_KEY you already use for ReceiptsFlow. Ryan will need to get one from console.anthropic.com.
- The admin pages should be dead simple — this is internal tooling, not a user-facing product. A textarea + some buttons is fine.
- Haiku occasionally generates content that starts with "Here's your article:" or wraps in code blocks. The system prompt tries to prevent this, but add a cleanup step that strips any preamble before saving.
- The blog frontend should be fast and SEO-optimized. Server-rendered, minimal JavaScript, proper heading hierarchy. Google cares about page speed for ranking.
- Use Sonnet for building the pipeline code. Use Haiku only for the actual content generation API calls.
