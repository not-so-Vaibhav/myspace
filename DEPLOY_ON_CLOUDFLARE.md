# ⚡ Deploying Frontend on Cloudflare Pages (Step-by-Step)

Deploying your Vite/React frontend on **Cloudflare Pages** is an excellent choice for global edge performance and free HTTPS!

---

## 1. SPA Routing Configuration (Already Done ✅)
We have automatically created the Cloudflare routing file at `frontend/public/_redirects`:
```
/*  /index.html  200
```
This ensures that when a user refreshes pages like `/meetings`, `/dashboard`, or `/student-profile`, Cloudflare Pages serves your React app instead of a 404 error page.

---

## 2. Cloudflare Pages Build Settings

When connecting your GitHub repository (`not-so-Vaibhav / myspace`) in the **Cloudflare Dashboard → Workers & Pages → Create Application → Pages → Connect to Git**, enter the following exact settings:

| Setting | Value to enter |
| :--- | :--- |
| **Project name** | `myspace-frontend` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` *(or None)* |
| **Root directory (path)** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

> [!IMPORTANT]
> Because you set the **Root directory** to `frontend`, the Build output directory is simply `dist` (do **not** enter `frontend/dist`).

---

## 3. Environment Variables in Cloudflare Pages

Before clicking **Save and Deploy**, expand **Environment variables (advanced)** and add:

| Variable Name | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://bxelrkxegyumuajizsvy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_BZPWastEbMSNRhhcxHyy_A_L5bB2kry` |
| `VITE_API_BASE_URL` | Your deployed Render backend URL (e.g., `https://myspace.onrender.com/api`) |

---

## 4. Troubleshooting CORS with your Render Backend

Once your Cloudflare frontend is live (e.g., `https://myspace-frontend.pages.dev`), make sure your Render backend allows requests from it. Your Express backend (`backend/server.js`) is already configured with `app.use(cors())`, which automatically accepts requests from your Cloudflare Pages domain!
