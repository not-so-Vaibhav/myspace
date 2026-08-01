# Enterprise Academic Credit System — Architecture (Phase 5)

This document outlines the architectural design of the **Phase 5: Enterprise Academic Credit System** for our University ERP, modeled after enterprise standards such as **TCS iON**, **Oracle PeopleSoft Campus Solutions**, and **SAP Campus Management**.

---

## 1. Architectural Overview

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           ENTERPRISE CREDIT ARCHITECTURE                          │
└───────────────────────────────────────────────────────────────────────────────────┘
   ▲                                       ▲                                    ▲
   │ 1. L-T-P Subject Weights              │ 2. Configurable Policy Engine      │ 3. Automated Trigger Sync
   ▼                                       ▼                                    ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│     public.subjects     │     │   public.credit_rules   │     │  trg_sync_student_cred  │
│  L + T + P = Total Cred │     │   160.0 Grad Req Creds  │     │  Real-time DB Trigger   │
│  0-Credit NSS / Intern  │     │   Elective/Open Limits  │     │  On Result / Reg change │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
   │                                       │                                    │
   ▼                                       ▼                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                 backend/services/enterpriseCreditService.js                       │
│      • calculateSubjectCredits(L, T, P, is_mandatory_non_credit, type)            │
│      • validateRegistrationCredits(studentId, semesterId, proposedCourses)        │
│      • getStudentCreditSummary(studentId, semesterId)                             │
│      • generateCreditReport(reportType, filters)                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                 FRONTEND CLIENT & ENTERPRISE DASHBOARDS                           │
│   • /student/credits  → EnterpriseCreditDashboard.jsx (WOW glassmorphism UI)      │
│   • /admin/credits    → EnterpriseCreditAdminPortal.jsx (Rules, CSV/Excel/Print)  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Subject Credit Model (L-T-P Calculator)
Every subject in `public.subjects` supports explicit instructional hour definitions:
*   `lecture_hours` (L): Lecture instruction hours per week.
*   `tutorial_hours` (T): Tutorial / discussion hours per week.
*   `practical_hours` (P): Laboratory / practical sessions per week.
*   `is_mandatory_non_credit`: Boolean flag for courses such as **NSS**, **Value Education**, and **Industrial Internships** that must appear on student transcripts with **0.0 Credits**.
*   **Formula:** Unless explicitly flagged as 0-credit, total subject credits default to:
    $$\text{Total Credits} = (L \times 1.0) + (T \times 1.0) + (P \times 1.0)$$

### 2.2 Configurable Institutional Policy Engine (`public.credit_rules`)
To eliminate hardcoded institutional constants, all academic credit rules are managed dynamically via `public.credit_rules`:
*   `min_semester_credits` (default: 12.0)
*   `max_semester_credits` (default: 26.0 — enforced ceiling to prevent overload)
*   `graduation_required_credits` (default: 160.0)
*   `honours_required_credits` (default: 20.0)
*   `minor_required_credits` (default: 18.0)
*   `max_elective_credits_per_sem` (default: 12.0)
*   `max_open_elective_credits_per_sem` (default: 6.0)

### 2.3 Real-Time Auditing & Automated Synchronization
*   **Database Triggers:** `trg_sync_student_credits()` automatically recalculates and synchronizes profile timestamps whenever `student_results` or `course_registrations` are updated.
*   **Service Level Automation:** `triggerCreditSynchronization()` is invoked after manual or bulk SGPA/CGPA recalculations, updating graduation eligibility and category distributions.

---

## 3. Database Schema Extensions & Reporting Views

### 3.1 `public.subjects` Extensions
```sql
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS lecture_hours NUMERIC(4,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS tutorial_hours NUMERIC(4,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS practical_hours NUMERIC(4,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS credit_type VARCHAR(50) DEFAULT 'Theory',
  ADD COLUMN IF NOT EXISTS is_mandatory_non_credit BOOLEAN DEFAULT false;
```

### 3.2 Enterprise Reporting Views
*   `v_student_credit_summary`: Multi-table aggregation of earned, registered, pending, failed, and backlog credits per student.
*   `v_student_credit_breakdown`: Detailed subject-level L-T-P breakdown of credits earned across semesters.
*   `v_credit_deficit_report`: Highlights students at risk of credit underflow or failing to meet minimum semester credit requirements.
*   `v_department_credit_analytics`: Department-level KPIs for Deans and HODs.

---

## 4. Zero-Regression Integration with Existing SGPA / CGPA Engine

Phase 5 was engineered with strict **Zero-Regression** architecture:
1.  **Existing Controller Preservation:** `backend/controllers/creditController.js` retains `getStudentMetrics`, `recalculateMetrics`, and `getTranscript` without modification.
2.  **Existing Route Preservation:** `backend/routes/creditRoutes.js` preserves `/metrics/:studentId`, `/recalculate/:studentId`, and `/transcript/:studentId`, appending new Phase 5 routes cleanly below them.
3.  **Unified Recalculation:** When an admin triggers `/api/credits/recalculate/:studentId`, both the legacy SGPA/CGPA engine (`creditEngineService.js`) and the new enterprise L-T-P engine (`enterpriseCreditService.js`) synchronize seamlessly.
