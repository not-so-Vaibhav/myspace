# Phase 9: Enterprise Notification Integration Architecture
**TCS iON / Oracle PeopleSoft Campus Solutions / SAP Campus Management Level**

## 1. Executive Overview
The **Enterprise Notification Integration Engine (Phase 9)** upgrades MIT-Learn ERP's basic notification features into an enterprise-class, multi-channel alerting and announcement platform. It connects with every core ERP module built across Phase 1 to Phase 8, guaranteeing reliable, automated, and targeted communication across students, faculty, HODs, deans, admins, and staff.

---

## 2. Architectural Blueprint & Core Capabilities

```
+-----------------------------------------------------------------------------------+
|                        ERP MODULE EVENT DISPATCHERS                              |
|   [Phase 1-3: Lifecycle & Progression]   [Phase 4: Course & Subject Registration] |
|   [Phase 5: Automated Attendance]        [Phase 6: Faculty Course Load]          |
|   [Phase 7: Academic Rules & Batch]      [Phase 8: Bulk Data Execution & Export]  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v  REST API / Direct Service Calls
+-----------------------------------------------------------------------------------+
|                     CENTRALIZED NOTIFICATION SERVICE                              |
|                     (backend/services/notificationService.js)                     |
|                                                                                   |
|  +---------------------------+   +----------------------+   +------------------+  |
|  | Priority Engine           |   | Channel Controller   |   | RBAC / Targeting |  |
|  | (CRITICAL/HIGH/MEDIUM/LOW)|   | (In-App / Email /    |   | (Audience/Scope  |  |
|  |                           |   |  Preferences Filter) |   |  Filtering)      |  |
|  +---------------------------+   +----------------------+   +------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v  Supabase / PostgreSQL
+-----------------------------------------------------------------------------------+
|                         ENTERPRISE DATABASE TABLES                                |
|   * public.notifications (User-specific alerts & read state)                      |
|   * announcements (Institutional broadcasts, pinned notices, category tagging)    |
|   * public.notification_preferences (Channel & category opt-out toggles)          |
|   * public.notification_audit_logs (Immutable compliance & event audit trail)     |
+-----------------------------------------------------------------------------------+
```

### Key Architectural Enhancements
1. **Multi-Module Dispatch Layer**:
   - `notifyUser(opts)`: Delivers structured, user-targeted notifications with actionable URL deep-links (`action_url`) and custom metadata.
   - `notifyBulkUsers(userIds, opts)`: Bulk delivery for cohorts, batches, and classes.
   - `notifyGroup(opts)`: Institutional and department-scoped broadcasts with approval workflows.
2. **Enterprise Priority & Category Classification**:
   - **Priorities**: `CRITICAL` (bypasses user opt-out preferences, highlighted with red borders & pulse animations), `HIGH`, `MEDIUM`, `LOW`.
   - **Categories**: `ACADEMIC`, `COURSE_REGISTRATION`, `ATTENDANCE`, `EXAM`, `ASSIGNMENT`, `FACULTY`, `ADMIN`, `ANNOUNCEMENT`, `REMINDER`.
3. **Automated Reminders Generator**:
   - `runAutomatedReminders(opts)`: Scans database for pending assignment deadlines (next 24h), course registration window closures, and attendance shortages below 75%, generating alerts automatically.
4. **User Preference Enforcement**:
   - Granular toggles for in-app delivery, email delivery, and individual category subscriptions. `CRITICAL` alerts automatically bypass opt-out settings for academic safety and compliance.

---

## 3. Database Schema & RLS Security

### Additive Extensions (`create_enterprise_notification_system.sql`)
- **`public.notifications`**:
  - `priority VARCHAR(20) DEFAULT 'MEDIUM'`
  - `category VARCHAR(50) DEFAULT 'ACADEMIC'`
  - `is_archived BOOLEAN DEFAULT FALSE`
  - `is_deleted BOOLEAN DEFAULT FALSE`
- **`announcements`**:
  - `priority VARCHAR(20) DEFAULT 'MEDIUM'`
  - `category VARCHAR(50) DEFAULT 'ANNOUNCEMENT'`
  - `target_scope VARCHAR(50) DEFAULT 'UNIVERSITY'`
  - `is_pinned BOOLEAN DEFAULT FALSE`
- **`public.notification_preferences`**:
  - `user_id UUID PRIMARY KEY REFERENCES auth.users(id)`
  - `in_app_enabled BOOLEAN DEFAULT TRUE`
  - `email_enabled BOOLEAN DEFAULT TRUE`
  - `categories JSONB DEFAULT '{"ACADEMIC": true, "EXAMS": true, "REMINDERS": true, "COURSE_REGISTRATION": true}'::jsonb`
- **`public.notification_audit_logs`**:
  - Records immutable event logs (`NOTIFICATION_CREATED`, `ANNOUNCEMENT_PUBLISHED`, `REMINDER_TRIGGERED`, `NOTIFICATION_READ`, `NOTIFICATION_DELETED`).

### Row-Level Security (RLS) Policies
- All policies enforce strict tenant & user isolation.
- `auth.uid() = user_id`: Users can only read and update their own notifications and preferences.
- Institutional announcements respect role-based audience filters (`student`, `faculty`, `both`, `all`).

---

## 4. Frontend & User Experience Integration
1. **Interactive Notification Drawer (`Topbar.jsx`)**:
   - Quick-access drawer with combined unread badge counter.
   - One-click **"Mark All Read"** action.
   - Visual priority badges and red outline pulse for `CRITICAL` items.
2. **Enterprise Notification & Announcement Center (`Announcements.jsx`)**:
   - **Search & Filter Toolbar**: Real-time keyword search, priority filter buttons (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and category pills.
   - **Notification Preferences Modal**: Interactive drawer allowing users to toggle in-app alerts, email digests, and individual category preferences.
   - **Admin/Faculty Announcement Builder**: Enhanced creation form supporting Priority, Category, Target Scope, and Pinning.

---

## 5. Automated Verification & Regression Matrix

| Test Suite File | Module Scope | Status | Total Tests |
| :--- | :--- | :---: | :---: |
| `tests/notificationEngine.test.js` | **Phase 9: Enterprise Notification Engine** | **PASS** | 10/10 |
| `tests/enterpriseBulkDataEngine.test.js` | **Phase 8: Bulk Data Management** | **PASS** | 16/16 |
| `tests/enterpriseReportingEngine.test.js` | **Phase 7: Enterprise Reporting Engine** | **PASS** | 12/12 |
| `tests/batchManagementEngine.test.js` | **Phase 7: Batch Management Engine** | **PASS** | 20/20 |
| `tests/academicRules.test.js` | **Phase 7: Academic Rules Engine** | **PASS** | 8/8 |
| `tests/enterpriseCreditEngine.test.js` | **Phase 6: Credit Engine** | **PASS** | 14/14 |
| `tests/workflowAutomation.test.js` | **Phase 5: Workflow Automation** | **PASS** | 5/5 |
| `tests/registrationEngine.test.js` | **Phase 4: Registration Engine** | **PASS** | 6/6 |
| `tests/creditEngine.test.js` | **Phase 4: Core Credits** | **PASS** | 3/3 |
| `tests/academicPromotion.test.js` | **Phase 3: Academic Promotion** | **PASS** | 4/4 |
| `tests/studentLifecycle.test.js` | **Phase 2: Student Lifecycle** | **PASS** | 3/3 |
| `tests/graduationEngine.test.js` | **Phase 1: Graduation Engine** | **PASS** | 4/4 |

**Total Verified Tests**: **105 / 105 (100% Pass Rate)**  
**Production Frontend Bundle**: Compiled successfully via `vite build` with **0 errors**.
