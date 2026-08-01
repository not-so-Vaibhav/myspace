# PHASE 4: ENTERPRISE COURSE REGISTRATION SYSTEM – API REFERENCE

Base URL: `/api/registration`
Authentication: JWT Header `Authorization: Bearer <token>` required on all endpoints.

---

## 1. Registration Windows

### `GET /api/registration/window`
Retrieves the active registration window configuration for a given academic year and semester.
- **Query Parameters**:
  - `academicYearId` (optional, string)
  - `semesterId` (optional, string)
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "window": {
      "id": "win-uuid",
      "academic_year_id": "ay-uuid",
      "semester_id": "sem-uuid",
      "start_date": "2026-07-01T00:00:00Z",
      "end_date": "2026-07-20T23:59:59Z",
      "status": "OPEN",
      "min_credits": 12.0,
      "max_credits": 26.0,
      "allow_late_registration": false
    }
  }
  ```

### `POST /api/registration/window` *(Admin / Dean only)*
Creates or updates a registration window.
- **Request Body**:
  ```json
  {
    "academic_year_id": "ay-uuid",
    "semester_id": "sem-uuid",
    "start_date": "2026-07-01T00:00:00Z",
    "end_date": "2026-07-20T23:59:59Z",
    "status": "OPEN",
    "min_credits": 12.0,
    "max_credits": 26.0,
    "allow_late_registration": false
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "window": { ... }
  }
  ```

---

## 2. Student Discovery & Self-Registration

### `GET /api/registration/available-courses`
Retrieves discovery course catalog with real-time seat occupancy, faculty details, and prerequisite status for the logged-in student.
- **Query Parameters**:
  - `studentId` (required, string)
  - `department` (optional, string)
  - `semesterId` (optional, string)
  - `category` (optional, string) – e.g. `Core`, `Elective`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "student": {
      "full_name": "Aarav Sharma",
      "program": "B.Tech",
      "department": "Computer Science",
      "semester": 5,
      "batch": "B1"
    },
    "courses": [
      {
        "allocation_id": "alloc-uuid",
        "subject_code": "CS301",
        "subject_name": "Database Management Systems",
        "subject_credits": 4.0,
        "subject_category": "Core",
        "faculty_name": "Dr. Rajesh Kumar",
        "capacity": 60,
        "enrolled_count": 42,
        "utilization_percentage": 70.0,
        "my_registration_status": "REGISTERED",
        "prerequisites": [
          { "id": "sub-1", "code": "CS101", "name": "Intro to Programming" }
        ]
      }
    ]
  }
  ```

### `POST /api/registration/register`
Self-registers the logged-in student into a course allocation. Evaluates all 10 engine validation rules.
- **Request Body**:
  ```json
  {
    "studentId": "student-uuid",
    "allocationId": "alloc-uuid"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "registration": {
      "id": "reg-uuid",
      "student_id": "student-uuid",
      "allocation_id": "alloc-uuid",
      "status": "REGISTERED",
      "registered_at": "2026-07-26T14:58:00Z"
    }
  }
  ```
- **Error Response** `400 Bad Request` / `403 Forbidden`:
  ```json
  {
    "success": false,
    "message": "Registration window is currently CLOSED for this semester.",
    "validationErrors": ["WINDOW_CLOSED"]
  }
  ```

### `POST /api/registration/drop`
Drops an active course registration and releases the seat.
- **Request Body**:
  ```json
  {
    "studentId": "student-uuid",
    "allocationId": "alloc-uuid",
    "reason": "Schedule conflict with Minor elective"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "registration": {
      "id": "reg-uuid",
      "status": "DROPPED",
      "dropped_at": "2026-07-26T15:00:00Z"
    }
  }
  ```

### `GET /api/registration/my-dashboard`
Returns student dashboard KPI statistics (credits registered, limits, remaining electives).
- **Query Parameters**: `studentId` (string)

---

## 3. Faculty Dashboard

### `GET /api/registration/faculty/courses`
Returns all course allocations assigned to the instructor along with real-time seat capacity gauges.
- **Query Parameters**: `facultyId` (string)
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "courses": [
      {
        "allocation_id": "alloc-uuid",
        "subject_code": "CS301",
        "subject_name": "Database Management Systems",
        "subject_credits": 4.0,
        "capacity": 60,
        "enrolled_count": 42,
        "utilization_percentage": 70.0
      }
    ]
  }
  ```

### `GET /api/registration/faculty/students/:allocationId`
Retrieves full student roster enrolled in a faculty member's allocation.
- **Path Parameter**: `allocationId` (string)
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "students": [
      {
        "id": "reg-uuid",
        "student_id": "student-uuid",
        "status": "REGISTERED",
        "registered_at": "2026-07-26T10:00:00Z",
        "student": {
          "enrollment_no": "MIT2024001",
          "full_name": "Aarav Sharma",
          "email": "aarav.sharma@mit.edu",
          "department": "Computer Science",
          "semester": 5
        }
      }
    ]
  }
  ```

---

## 4. Admin Management & Analytics

### `POST /api/registration/admin/force-register` *(Admin / Dean only)*
Admin override to force-register a student even if window is closed or course is full.
- **Request Body**:
  ```json
  {
    "studentId": "student-uuid",
    "allocationId": "alloc-uuid",
    "reason": "Special clearance by Dean of Academics"
  }
  ```

### `POST /api/registration/admin/force-drop` *(Admin / Dean only)*
Admin override to force-drop a student's course registration.

### `POST /api/registration/admin/bulk-register` *(Admin only)*
Bulk imports multiple registrations in a single transaction.
- **Request Body**:
  ```json
  {
    "registrations": [
      { "studentId": "student-uuid-1", "allocationId": "alloc-uuid" },
      { "studentId": "student-uuid-2", "allocationId": "alloc-uuid" }
    ]
  }
  ```

### `GET /api/registration/admin/analytics`
Enterprise reporting aggregation endpoint powering Recharts dashboards.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "overallSummary": {
      "totalRegistrations": 340,
      "activeRegistrationsCount": 320,
      "totalCreditsRegistered": 1280.0
    },
    "departmentStats": [
      { "department": "Computer Science", "registered_students": 120, "total_students": 125, "completion_pct": 96.0 }
    ],
    "electivePopularity": [
      { "subject_code": "CS405", "subject_name": "Cloud Computing", "total_registered": 58 }
    ],
    "seatUtilization": [ ... ],
    "unregisteredStudents": [ ... ]
  }
  ```

### `GET /api/registration/admin/audit-logs`
Retrieves immutable audit logs for compliance and governance review.
- **Query Parameters**: `studentId`, `action`, `startDate`, `endDate`, `limit`
