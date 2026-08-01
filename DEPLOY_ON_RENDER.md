# 🚀 Production Deployment Guide: GitHub & Render.com

This guide provides step-by-step instructions for committing your **MIT-Learn LMS (MYSPACE)** project to GitHub and deploying both the **Node.js/Express Backend** and **Vite/React Frontend** to **Render.com**.

---

## Part 1: Readying & Pushing to GitHub

We have configured a comprehensive `.gitignore` file at the project root to ensure that `node_modules`, build artifacts (`dist/`), temporary backup directories (`node_modules_backup_*`), and local environment secrets (`.env`) are never pushed to GitHub.

### 1. Initialize & Push to Your Repository
Open your terminal in the project root (`/Users/vaibhavbariyar/Desktop/mit-learn-react/myspace`) and run:

```bash
# 1. Stage all project files (except .gitignore excluded files)
git add .

# 2. Commit your changes
git commit -m "feat: Enterprise LMS full-stack release ready for Render deploy"

# 3. Add your remote GitHub repository (if not already added)
# git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# 4. Push to main branch
git push -u origin main
```

---

## Part 2: Deploying on Render.com (Two Options)

### Option A: Automatic 1-Click Deploy using Render Blueprint (`render.yaml`) — Recommended ⭐

A complete `render.yaml` Blueprint is already included in your project root.

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` and configure two services:
   - **`mit-learn-backend`** (Node.js Web Service running `node server.js`)
   - **`mit-learn-frontend`** (Static Site with SPA rewrite rules `/* -> /index.html`)
5. In the Render environment variable prompt, enter your Supabase & Cloudinary keys:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Apply** — Render will build and deploy both services automatically!

---

### Option B: Manual Service Creation on Render Dashboard

If you prefer to create the services manually in Render:

#### Step 1: Deploy Backend (Web Service)
1. Go to **New +** -> **Web Service** and connect your GitHub repo.
2. Configure the Backend Service:
   - **Name**: `mit-learn-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
3. Add Environment Variables under **Environment**:
   - `PORT`: `5001`
   - `NODE_ENV`: `production`
   - `SUPABASE_URL`: `<your_supabase_url>`
   - `SUPABASE_SERVICE_KEY`: `<your_supabase_service_role_key>`
   - `CLOUDINARY_CLOUD_NAME`: `<optional_cloudinary_name>`
   - `CLOUDINARY_API_KEY`: `<optional_cloudinary_key>`
   - `CLOUDINARY_API_SECRET`: `<optional_cloudinary_secret>`
4. Click **Create Web Service** and copy the generated Backend URL (e.g., `https://mit-learn-backend.onrender.com`).

#### Step 2: Deploy Frontend (Static Site)
1. Go to **New +** -> **Static Site** and select the same GitHub repo.
2. Configure the Frontend Service:
   - **Name**: `mit-learn-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add Environment Variables under **Environment**:
   - `VITE_SUPABASE_URL`: `<your_supabase_url>`
   - `VITE_SUPABASE_ANON_KEY`: `<your_supabase_anon_key>`
   - `VITE_API_BASE_URL`: `<your_backend_render_url>` (e.g., `https://mit-learn-backend.onrender.com/api`)
4. **Configure React Router Rewrite Rule**:
   - Go to the **Redirects/Rewrites** tab in your Frontend Static Site settings.
   - Add a rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
5. Click **Create Static Site**. Your enterprise LMS is now live!

---

## Part 3: Database & Real-Time Sync Checklist

1. Make sure you have run the following SQL migration scripts in your **Supabase SQL Editor** so that all tables and Row Level Security (RLS) policies are active:
   - `create_academic_rules.sql`
   - `create_student_lifecycle.sql`
   - `fix_meetings_and_live_announcements_rls.sql`
   - `fix_announcements_rls.sql`
   - `fix_lifecycle_history_rls.sql`
   - `fix_enterprise_bulk_import_rls.sql`
2. Test login with your Student, Faculty, HOD, and Dean accounts. All features, announcements, schedules, and live video rooms will work seamlessly across your production Render deployment!
