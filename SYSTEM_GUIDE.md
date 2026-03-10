# LearnHub LMS – System Guide

This guide explains what the project is, how it works, and how to run and use it. It is written in simple, beginner-friendly language.

---

## 1. Project Overview

**LearnHub** is a **Learning Management System (LMS)** built for students and instructors. It is a web application where:

- **Students** can sign up, enroll in courses, take lessons, track their progress, take notes, and upload files (e.g. PDFs).
- **Faculty (instructors)** can create courses, add modules and lessons, upload course resources, and see how many students are enrolled and how they are progressing.

The system is **role-based**: what you see and can do depends on whether you are a **Student** or **Faculty**. Students cannot create or edit courses; faculty cannot see other students’ private notes.

---

## 2. Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Frontend** | React 19, Vite 7, React Router 7, Tailwind CSS 4, Recharts, Lucide React |
| **Backend** | Supabase (Auth, PostgreSQL, Storage) |
| **Auth**    | Supabase Auth (email + password) |
| **Database**| Supabase PostgreSQL with Row Level Security (RLS) |
| **Storage** | Supabase Storage (student notes, course resources) |

The frontend runs in the browser; all data and authentication are handled by Supabase.

---

## 3. How Authentication Works

- **Sign up**: On the Login page, use “Sign Up” and enter your full name, email, password, and choose **Student** or **Faculty**. Supabase creates the account and a **profile** row with your role.
- **Sign in**: Enter email and password. Supabase checks credentials and starts a session.
- **Profile & role**: After login, the app loads your profile from the `profiles` table. The **role** field (`student` or `instructor`) controls which dashboard and features you see.
- **Protected routes**: If you are not logged in, you are redirected to the login page. If you are a student and try to open a faculty-only URL (e.g. faculty dashboard), you are redirected to the student dashboard.

---

## 4. Role Definitions

### Student Role

**Can do:**

- Register and log in (Supabase Auth).
- View the list of courses and enroll in courses.
- Open a course and see its modules and lessons.
- Mark lessons as complete; progress (percentage and last activity) is saved.
- Create, edit, and delete **personal notes**.
- Link notes to a course and optionally to a module.
- Upload files (e.g. PDFs) attached to notes; files are stored in Supabase Storage.
- View the learning progress graph on the dashboard.
- See dashboard summary: enrolled courses, progress, recent activity.
- View **Resources** for courses they are enrolled in (download links).

**Cannot do:**

- Create or edit courses.
- Upload course-wide content (that is for faculty).
- See other students’ data or notes.

### Faculty / Instructor Role

**Can do:**

- Log in via Supabase Auth (no student self-registration for faculty in the default flow; faculty accounts are created with role `instructor` in the database or via sign-up with “Faculty” selected).
- Create and manage **courses** (title, description).
- Add **modules** and **lessons** to their courses.
- Upload **course resources** (e.g. PDFs) for their courses; files are stored in Supabase Storage.
- View **enrolled students count** per course.
- View **student engagement/progress** (read-only) for their courses.

**Cannot do:**

- Edit students’ personal notes.
- Access admin-level settings unless the role is explicitly extended (e.g. `admin`) in your setup.

---

## 5. How to Operate the System

### As a Student

1. **Sign up / Log in**  
   Open the app, go to Login, and sign up (or sign in). Choose **Student** when signing up.

2. **Dashboard**  
   After login you are taken to the **Student Dashboard**. You see:
   - A welcome banner.
   - Overview cards (e.g. enrolled courses, hours learned).
   - Popular courses and a link to “See All Courses”.
   - Learning activity graph (progress over time).
   - Shortcuts to Notes and Resources.

3. **Courses**  
   - Go to **Courses** in the sidebar.
   - Browse the list and click **Enroll** on a course you want.
   - Click a course to open its detail page.

4. **Inside a course**  
   - You see **modules** and **lessons**.
   - Click the circle next to a lesson to **mark it complete**. Your progress (e.g. 3/10 lessons, 30%) and last activity are saved.
   - In **Resources** on the same page you can open or download files the instructor uploaded.

5. **Notes**  
   - Go to **Notes** in the sidebar.
   - Create a note (title + content). You can optionally link it to a **course** and a **module**.
   - Use the upload icon on a note to attach a file (e.g. PDF). You can later open or download it from the note card.

6. **Resources**  
   - Go to **Resources** to see all resources from courses you are enrolled in, grouped by course. Click a file to open or download it.

### As a Faculty Member

1. **Log in**  
   Sign in with an account that has the **instructor** (or **admin**) role.

2. **Dashboard**  
   You see the **Faculty Dashboard**: welcome banner, “Create New Course” button, overview (e.g. total students, active courses), popular courses, and “Best Instructors”.

3. **Create a course**  
   - From the dashboard or from **Courses**, click **Create Course** (or “New Note” equivalent for courses).
   - Enter a title (and description if you add that in the UI). The course is created and you are its instructor.

4. **Manage a course**  
   - Open **Courses** and click one of your courses (or the new one).
   - **Add module**: use “Add module”, enter a title, and confirm.
   - **Add lesson**: under a module, use “Add lesson”, enter a title, and confirm.
   - **Upload resources**: in the Resources section of the course page, use “Upload file” and choose a file (e.g. PDF). It is stored in Supabase Storage and listed for students enrolled in that course.

5. **See engagement**  
   - On the course detail page you see **Enrolled students** count.
   - Student progress (e.g. lessons completed) is stored in the database; you can use it for analytics (e.g. in future features or dashboards).

6. **Resources**  
   - Go to **Resources** to see resources you uploaded, grouped by course. You can open a course to upload more.

---

## 6. Folder Structure (Frontend)

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── api/                # Legacy API client (e.g. axios) if used
│   ├── components/
│   │   ├── Dashboard/      # Dashboard UI: WelcomeBanner, StatsCards, ActivityGraph, CourseCard, InstructorCard
│   │   └── Layout/         # Sidebar, Topbar
│   ├── context/
│   │   └── AuthContext.jsx # Auth state (user, profile, role, signOut)
│   ├── hooks/
│   │   └── useDashboardData.js # Data hooks for dashboard (enrolled courses, progress, popular courses, instructors)
│   ├── lib/
│   │   └── supabase.js     # Supabase client (uses env vars)
│   ├── pages/
│   │   ├── Login.jsx       # Login / Sign up
│   │   ├── StudentDashboard.jsx
│   │   ├── FacultyDashboard.jsx
│   │   ├── Courses.jsx    # Course list (enroll / create by role)
│   │   ├── CourseDetail.jsx # Modules, lessons, progress, resources
│   │   ├── Notes.jsx      # Notes CRUD, course/module link, file upload
│   │   ├── Resources.jsx  # View (student) or list (faculty) course resources
│   │   └── Placeholder.jsx # “Coming soon” for other nav links
│   ├── services/
│   │   └── courses.js     # Course, module, lesson, enrollment, progress, resources API
│   ├── App.jsx            # Routes, ProtectedLayout, RoleRoute
│   ├── main.jsx
│   └── index.css          # Global styles and design tokens
├── .env.example            # Example env vars (no secrets)
├── package.json
└── vite.config.js
```

**Root (project):**

- `supabase_schema.sql` – Base schema (profiles, courses, trigger for new user).
- `notes_schema.sql` – Notes table and RLS.
- `supabase_migrations.sql` – Modules, lessons, enrollments, lesson_progress, notes extensions, notes_files, course_resources, courses update/delete policies.

---

## 7. Environment Variables

The frontend needs Supabase URL and anonymous key. These are **secrets** and must not be committed.

1. Copy the example file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. Open `frontend/.env` and set:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   Get both from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**.

3. Do **not** commit `.env`. It should be in `.gitignore`.

---

## 8. How to Run the Project Locally

**Prerequisites:** Node.js (e.g. 18+) and npm installed.

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   - Create `frontend/.env` from `frontend/.env.example` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as above.

3. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL Editor, run **once** in order:
     - `supabase_schema.sql`
     - `notes_schema.sql`
     - `supabase_migrations.sql`  
     If you see “policy already exists” for courses, you can comment out the two `create policy` lines for “Instructors can update/delete own courses” in `supabase_migrations.sql` and run the rest.
   - In **Storage**, create two buckets:
     - `student-notes` (for student note attachments).
     - `course-resources` (for instructor course files).  
     Set RLS so users can only access their own paths (e.g. by `user_id` / course folder).

4. **Start the app**
   ```bash
   npm run dev
   ```
   Open the URL shown (e.g. `http://localhost:5173`).

5. **Build for production**
   ```bash
   npm run build
   ```
   Output is in `frontend/dist`. Serve that folder with any static host.

---

## Quick Reference

| Task              | Student                    | Faculty                          |
|-------------------|----------------------------|----------------------------------|
| Register / Login  | Yes (choose Student)       | Yes (choose Faculty) or DB role  |
| View courses      | Yes                        | Yes (their courses)              |
| Enroll            | Yes                        | N/A                              |
| Create course     | No                         | Yes                              |
| Add modules/lessons | No                       | Yes                              |
| Mark lesson done  | Yes                        | N/A                              |
| Notes             | Yes (own only)             | Yes (own only)                   |
| Upload note files | Yes                        | Yes (own notes)                  |
| Course resources  | View/download (enrolled)   | Upload & manage (their courses)  |
| See progress      | Own only                   | Read-only for their courses      |

If something does not work, check the browser console and Supabase logs, and ensure all SQL scripts and storage buckets (with RLS) are set up as described above.
