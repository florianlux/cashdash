# CashDash Newsletter Dashboard

A minimal, dark-themed newsletter dashboard built with vanilla JavaScript, Netlify Functions, and Supabase.

## Features

- 📧 **Newsletter Signup**: Simple email subscription form
- 👤 **Admin Dashboard**: Manage subscribers with token-based authentication
- 📊 **Stats**: View total active subscribers and last 24h signups
- 💾 **CSV Export**: Export active subscribers
- 🔒 **Secure**: No secrets in frontend, admin token protected endpoints

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Netlify Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Netlify

## Project Structure

```
cashdash/
├── public/                  # Static frontend files
│   ├── index.html          # Newsletter signup page
│   ├── admin.html          # Admin dashboard
│   ├── styles.css          # Dark minimal styling
│   ├── app.js              # Newsletter form logic
│   └── admin.js            # Admin dashboard logic
├── netlify/functions/      # Serverless functions
│   ├── newsletter-signup.js    # PUBLIC: Handle subscriptions
│   ├── admin-subscribers.js    # PROTECTED: Manage subscribers
│   └── admin-health.js         # PROTECTED: Health check
├── supabase/migrations/    # Database migrations
│   └── 001_newsletter.sql  # Newsletter table schema
├── netlify.toml            # Netlify configuration
├── package.json            # Node dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Netlify account (for deployment)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and service role key
4. Run the migration SQL:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents from `supabase/migrations/001_newsletter.sql`
   - Run the SQL to create the table

### 4. Set Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ADMIN_TOKEN=your_secure_random_token_here
```

**Important**: 
- Use the **service role key** (not the anon key) for server-side operations
- Generate a strong random token for `ADMIN_TOKEN` (e.g., use `openssl rand -hex 32`)

### 5. Run Locally

```bash
npm run dev
```

This starts Netlify Dev which:
- Serves the frontend on `http://localhost:8888`
- Runs serverless functions locally
- Loads environment variables from `.env`

### 6. Test the Application

**Newsletter Signup (Public):**
```bash
curl -X POST http://localhost:8888/.netlify/functions/newsletter-signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{"ok":true,"message":"Subscribed successfully!"}
```

**Admin Health Check:**
```bash
curl http://localhost:8888/.netlify/functions/admin-health \
  -H "x-admin-token: your_admin_token"
```

Expected response:
```json
{"ok":true,"env":{...},"supabase":{"connected":true}}
```

**List Subscribers (Admin):**
```bash
curl http://localhost:8888/.netlify/functions/admin-subscribers?status=active \
  -H "x-admin-token: your_admin_token"
```

**Export CSV (Admin):**
```bash
curl http://localhost:8888/.netlify/functions/admin-subscribers?export=csv \
  -H "x-admin-token: your_admin_token"
```

## Deployment to Netlify

### Option 1: Git-based Deployment (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://netlify.com) and click "Add new site"
3. Connect your repository
4. Configure build settings:
   - Build command: (leave empty)
   - Publish directory: `public`
5. Add environment variables in Netlify UI:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_TOKEN`
6. Deploy!

### Option 2: Netlify CLI

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## Usage

### Public Newsletter Signup

1. Open the deployed site (e.g., `https://your-site.netlify.app`)
2. Enter email and click "Subscribe"
3. Subscriber is added to database

### Admin Dashboard

1. Navigate to `/admin.html`
2. Enter your `ADMIN_TOKEN`
3. View stats: total active subscribers and last 24h signups
4. Manage subscribers: view list, deactivate users, export CSV

## API Endpoints

### Public Endpoints

**POST** `/.netlify/functions/newsletter-signup`
- Subscribe to newsletter
- Body: `{ "email": "user@example.com" }`
- Returns: `{ "ok": true, "message": "..." }` or `{ "ok": false, "error": "..." }`

### Protected Endpoints (require `x-admin-token` header)

**GET** `/.netlify/functions/admin-subscribers?status=active|all`
- List subscribers
- Returns: `{ "subscribers": [...], "stats": {...} }`

**PATCH** `/.netlify/functions/admin-subscribers`
- Deactivate subscriber
- Body: `{ "id": "uuid" }`
- Returns: `{ "success": true, "data": {...} }`

**GET** `/.netlify/functions/admin-subscribers?export=csv`
- Export active subscribers as CSV
- Returns: CSV file

**GET** `/.netlify/functions/admin-health`
- Health check
- Returns: `{ "ok": true, "env": {...}, "supabase": {...} }`

## Security

- ✅ No secrets in frontend code
- ✅ Admin endpoints protected by token authentication
- ✅ Server-side email validation
- ✅ CORS configured for all endpoints
- ✅ Supabase service role key used server-side only
- ✅ SQL injection protection via Supabase client

## Development

### File Structure

- **Frontend** (`public/`): Pure vanilla JS, no build step required
- **Backend** (`netlify/functions/`): Node.js serverless functions
- **Database** (`supabase/migrations/`): SQL migrations

### Making Changes

1. Edit files in `public/` for frontend changes
2. Edit files in `netlify/functions/` for backend changes
3. Test locally with `npm run dev`
4. Commit and push to deploy (if using git-based deployment)

## Troubleshooting

### "Server configuration error"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Verify environment variables in Netlify dashboard (for production)

### "Unauthorized" on admin endpoints
- Ensure `ADMIN_TOKEN` matches in `.env` and your requests
- Check that `x-admin-token` header is being sent

### "Email already subscribed"
- This is expected behavior for duplicate emails
- User sees "Email already subscribed" message

### Database connection issues
- Verify Supabase project is active
- Check that migration SQL was run successfully
- Test connection using admin health endpoint

## License

MIT
