# dropcharge-newsletter-dashboard

Dark minimal cyber-console newsletter dashboard.  
**Stack:** Static frontend (vanilla JS) · Netlify Functions (Node 18) · Supabase

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never in frontend) |
| `ADMIN_TOKEN` | Secret token for the admin dashboard |

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd cashdash
npm install
```

### 2. Configure env vars

```bash
cp .env.example .env
# Edit .env with your real values
```

### 3. Run Supabase migration

In your Supabase project → SQL editor, run:

```sql
-- contents of supabase/migrations/001_newsletter.sql
create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);
```

### 4. Run locally

```bash
npm run dev
# → http://localhost:8888
```

---

## Smoke Tests

```bash
# Subscribe (success)
curl -s -X POST http://localhost:8888/.netlify/functions/newsletter-signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}' | jq

# Subscribe (duplicate)
curl -s -X POST http://localhost:8888/.netlify/functions/newsletter-signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}' | jq

# Health check (replace TOKEN with your ADMIN_TOKEN)
curl -s http://localhost:8888/.netlify/functions/admin-health \
  -H 'x-admin-token: TOKEN' | jq

# List subscribers
curl -s 'http://localhost:8888/.netlify/functions/admin-subscribers?status=active' \
  -H 'x-admin-token: TOKEN' | jq

# Export CSV
curl -s 'http://localhost:8888/.netlify/functions/admin-subscribers?export=csv' \
  -H 'x-admin-token: TOKEN'

# Deactivate subscriber (replace UUID)
curl -s -X PATCH http://localhost:8888/.netlify/functions/admin-subscribers \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: TOKEN' \
  -d '{"id":"<subscriber-uuid>"}' | jq
```

---

## Deploy to Netlify

```bash
# Option A – Git-based (recommended)
# 1. Push repo to GitHub/GitLab
# 2. Connect repo in Netlify UI → Add new site → Import from Git
# 3. Set env vars in Netlify UI → Site settings → Environment variables

# Option B – CLI
npm install -g netlify-cli
netlify login
netlify init      # link or create site
netlify env:set SUPABASE_URL           "https://xxx.supabase.co"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJ..."
netlify env:set ADMIN_TOKEN            "your-secret-token"
netlify deploy --prod
```

---

## File Structure

```
/
├── public/
│   ├── index.html       # Newsletter signup banner
│   ├── admin.html       # Admin dashboard
│   ├── styles.css       # Dark minimal cyber-console styles
│   ├── app.js           # Frontend signup logic
│   └── admin.js         # Admin dashboard logic
├── netlify/functions/
│   ├── newsletter-signup.js    # POST /newsletter-signup (public)
│   ├── admin-subscribers.js    # GET|PATCH /admin-subscribers (protected)
│   └── admin-health.js         # GET /admin-health (protected)
├── supabase/migrations/
│   └── 001_newsletter.sql
├── netlify.toml
├── package.json
├── .env.example
└── README.md
```
