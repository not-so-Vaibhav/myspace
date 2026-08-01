# PHASE 4: ENTERPRISE COURSE REGISTRATION SYSTEM (ARCHITECTURE & SPECIFICATION)

## 1. Executive Summary
The **Enterprise Course Registration System (Phase 4)** is a mission-critical module of the MIT-Learn LMS designed to manage academic course discovery, self-registration, prerequisite validation, credit limits, seat capacity allocation, faculty roster supervision, and administrative window control.

Built as an enterprise-grade extension to Phase 1 (Database Foundation) and Phase 2 (Academic Rules, Promotion, Credit, Graduation, Workflow), Phase 4 operates on a **zero-redesign, backwards-compatible** architecture. Through a PostgreSQL database trigger (`sync_registration_to_enrollment`), all registration records automatically synchronize into `student_enrollments`, preserving 100% compatibility with existing attendance, grading, and assignment features.

---

## 2. Architecture & Design Decisions

```
+-----------------------------------------------------------------------------------+
|                        1. PRESENTATION LAYER (React UI)                           |
|   +--------------------------+  +--------------------------+  +---------------+   |
|   | Student Course Discovery |  | Faculty Registration Dash|  | Admin Control |   |
|   +--------------------------+  +--------------------------+  +---------------+   |
+-----------------------------------------+-----------------------------------------+
                                          | REST API (Axios / JWT)
+-----------------------------------------v-----------------------------------------+
|                        2. CONTROLLER & ROUTING LAYER                              |
|   /api/registration/window | /available-courses | /register | /drop | /analytics  |
+-----------------------------------------+-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                   3. BUSINESS LOGIC & 10-POINT VALIDATION ENGINE                  |
|   +---------------------------------------------------------------------------+   |
|   | (1) Registration Window Check        (6) Seat Capacity (Capacity - Enrol) |   |
|   | (2) Semester Credit Min/Max Limit    (7) Duplicate & Conflict Check      |   |
|   | (3) Prerequisite Clearance Engine    (8) Fee & Backlog Academic Hold     |   |
|   | (4) Core vs. Elective Balance        (9) Admin Override Capability       |   |
|   | (5) Student Active Status Check     (10) Immutable Audit Trail Logging    |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------+-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                      4. DATA ACCESS & REPOSITORY LAYER                            |
|   - registrationRepository.js -> Supabase PostgreSQL (RLS Protected)              |
+-----------------------------------------+-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                       5. DATABASE & TRIGGER LAYER                                 |
|   - subjects (extended: category, credits, capacity)                              |
|   - course_registration_windows | course_registrations | registration_audit_logs  |
|   - Trigger: sync_registration_to_enrollment -> student_enrollments               |
+-----------------------------------------------------------------------------------+
```

---

## 3. The 10-Point Validation Engine
Every student course registration request passes through an atomic, 10-point rule engine in `backend/services/registrationService.js`:

1. **Registration Window Check**: Verifies that the current timestamp falls within an active (`OPEN`) window for the student's semester in `course_registration_windows`.
2. **Semester Credit Limits**: Computes current enrolled credits + new course credits. Enforces minimum (default `12.0`) and maximum (`26.0`) semester credit boundaries.
3. **Prerequisite Clearance Validation**: Inspects `subject_prerequisites` and cross-references `academic_records` to verify the student has passed all prerequisite subjects (`status = 'PASSED'`).
4. **Core vs. Elective Balance**: Validates category constraints (`Core`, `Elective`, `Honours`, `Minor`).
5. **Student Status Eligibility**: Confirms the student lifecycle state is `ACTIVE` (not `SUSPENDED`, `HELD_BACK`, or `DISCONTINUED`).
6. **Seat Capacity Enforcement**: Checks real-time seat availability (`enrolled_count < capacity`).
7. **Duplicate & Schedule Conflict Check**: Prevents registering for a course/allocation already registered or dropped within the same term.
8. **Fee & Academic Hold Verification**: Rejects self-registration if an administrative hold is placed on the student's account.
9. **Admin Force Override Capability**: Allows Deans/Admins (`isAdminOverride=true`) to bypass window deadlines, prerequisite checks, and seat limits, recording the justification in the audit trail.
10. **Immutable Audit Trail**: Every registration, drop, or override generates a permanent log entry in `registration_audit_logs` storing action type, user ID, IP address, timestamp, and justification.

---

## 4. Database Extensions & Schema

### Extended Table: `subjects`
- `subject_category` (`VARCHAR(50)`): `'Core'`, `'Elective'`, `'Open Elective'`, `'Honours'`, `'Minor'`.
- `subject_credits` (`NUMERIC(4,2)`): Default `3.0`.
- `capacity` (`INTEGER`): Maximum seat capacity (default `60`).

### New Tables
1. **`course_registration_windows`**:
   - Stores `academic_year_id`, `semester_id`, `start_date`, `end_date`, `status` (`OPEN`, `CLOSED`, `SCHEDULED`), `min_credits`, `max_credits`, `allow_late_registration`.
2. **`course_registrations`**:
   - Stores `student_id`, `allocation_id`, `status` (`REGISTERED`, `DROPPED`, `WAITLISTED`, `AUTO_ASSIGNED`, `ADMIN_OVERRIDE`), `registered_at`, `dropped_at`, `drop_reason`.
3. **`registration_audit_logs`**:
   - Immutable audit trail storing `student_id`, `registration_id`, `action`, `performed_by`, `reason`, `ip_address`, `created_at`.

### Reporting Views
- `v_seat_utilization`: Real-time seat occupancy percentage per allocation.
- `v_elective_popularity`: Aggregate popularity ranking of elective subjects.
- `v_course_registration_analytics`: Department and semester-wise registration completion rates.
- `v_unregistered_students`: Roster of active students with zero registrations in the active term.
- `v_student_registration_summary`: Student credit progress and registration count summary.

---

## 5. Backward Compatibility & Trigger Synchronization
To ensure Phase 4 does not disrupt existing LMS features:
```sql
CREATE OR REPLACE FUNCTION fn_sync_registration_to_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('REGISTERED', 'AUTO_ASSIGNED', 'ADMIN_OVERRIDE') THEN
        INSERT INTO student_enrollments (student_id, allocation_id, enrolled_at, status)
        VALUES (NEW.student_id, NEW.allocation_id, NEW.registered_at, 'ACTIVE')
        ON CONFLICT (student_id, allocation_id) DO UPDATE SET status = 'ACTIVE';
    ELSIF NEW.status = 'DROPPED' THEN
        UPDATE student_enrollments
        SET status = 'DROPPED'
        WHERE student_id = NEW.student_id AND allocation_id = NEW.allocation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Whenever a student registers, an enrollment record is created/updated in `student_enrollments`, enabling existing grading, attendance, and assignment modules to operate without code modifications.

---

## 6. Frontend Components & Export Utilities
- **Student Portal (`/course-registration`)**: Features Registration Window countdown banner, Student Discovery Header with live credit progress bars, multi-category filter bar, seat availability gauges, Prerequisite checking tags, and Export buttons (**Excel `.xls`**, **CSV `.csv`**, **PDF / Print**).
- **Faculty Dashboard (`/faculty/course-registration`)**: Features allocated course strength gauges, enrolled student search/roster, roster Excel/CSV export, and direct **Attendance Shortcut**.
- **Admin Control Panel (`/course-registration-admin`)**: Features interactive **Recharts** analytics (department completion bar charts, elective popularity tables, unregistered students export), Registration Window manager, Admin Override & Bulk tool, and an Immutable Audit Trail viewer.
