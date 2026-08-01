# Enterprise Academic Credit System — API Documentation (Phase 5)

This document specifies the RESTful endpoints for the **Enterprise Academic Credit System** (TCS iON / Oracle PeopleSoft / SAP Campus Management style), supporting **L-T-P (Lecture-Tutorial-Practical)** custom credit calculations, **0-Credit Mandatory Courses**, **Configurable Institutional Rules**, **Real-Time Credit Auditing**, and **Graduation Eligibility Evaluation**.

---

## 1. Get Student Credit Portfolio Summary

Retrieves a comprehensive credit summary for a student across all semesters or a specific semester, broken down by credit category (Core, Elective, Minor, Honours, Mandatory Non-Credit) and academic progress.

*   **Endpoint:** `GET /api/credits/student/:studentId/summary` (or `/api/credits/summary/:studentId`)
*   **Query Parameters:**
    *   `semesterId` (optional): Filter calculations for a specific semester UUID.
*   **Response:** `200 OK`

```json
{
  "status": "success",
  "data": {
    "student_id": "student-1",
    "semester_id": null,
    "registered_credits": 24.0,
    "semester_registered_credits": 24.0,
    "earned_credits": 160.0,
    "completed_credits": 160.0,
    "pending_credits": 0.0,
    "failed_credits": 0.0,
    "backlog_credits": 0.0,
    "minor_credits_earned": 18.0,
    "honours_credits_earned": 20.0,
    "graduation_required_credits": 160.0,
    "remaining_graduation_credits": 0.0,
    "graduation_progress_percentage": 100.0,
    "credits_by_type": [
      { "credit_type": "Theory", "count": 30, "earned_credits": 110.0 },
      { "credit_type": "Practical", "count": 12, "earned_credits": 12.0 },
      { "credit_type": "Minor", "count": 6, "earned_credits": 18.0 },
      { "credit_type": "Honours", "count": 5, "earned_credits": 20.0 },
      { "credit_type": "NSS", "count": 1, "earned_credits": 0.0 }
    ],
    "is_graduation_eligible": true,
    "active_policy_name": "Standard Institutional Credit Policy (2026)"
  }
}
```

---

## 2. Validate Registration Credits

Validates whether a student can register for a set of proposed courses under current institutional credit policies. Enforces minimum/maximum credit limits, elective credit ceilings, and open elective caps.

*   **Endpoint:** `POST /api/credits/validate-registration`
*   **Request Body:**

```json
{
  "studentId": "student-1",
  "semesterId": "sem-5",
  "proposedCourses": [
    { "subject_code": "CS501", "credits": 4.0, "category": "Core" },
    { "subject_code": "CS502", "credits": 4.0, "category": "Core" },
    { "subject_code": "EL501", "credits": 4.0, "category": "Elective" }
  ]
}
```

*   **Response (Valid Registration):** `200 OK`

```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "isUnderflow": false,
    "total_proposed_credits": 12.0,
    "elective_credits": 4.0,
    "open_elective_credits": 0.0,
    "minor_credits": 0.0,
    "honours_credits": 0.0,
    "min_semester_credits": 12.0,
    "max_semester_credits": 26.0
  }
}
```

*   **Error Response (Credit Overflow):** `400 Bad Request`

```json
{
  "status": "error",
  "code": "ERROR_CREDIT_OVERFLOW",
  "message": "Credit overflow: Proposed total (28.0) exceeds maximum semester credit limit (26.0)"
}
```

---

## 3. List Configurable Institutional Credit Rules

Retrieves all configured institutional credit policies.

*   **Endpoint:** `GET /api/credits/rules`
*   **Response:** `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "id": "rule-2026",
      "rule_name": "Standard Institutional Credit Policy (2026)",
      "min_semester_credits": 12.0,
      "max_semester_credits": 26.0,
      "graduation_required_credits": 160.0,
      "honours_required_credits": 20.0,
      "minor_required_credits": 18.0,
      "max_elective_credits_per_sem": 12.0,
      "max_open_elective_credits_per_sem": 6.0,
      "is_active": true
    }
  ]
}
```

---

## 4. Create / Update Institutional Credit Policy

Creates a new credit policy or modifies an existing policy without requiring code changes or hardcoded constants.

*   **Endpoint:** `POST /api/credits/rules` (or `PUT /api/credits/rules/:id`)
*   **Request Body:**

```json
{
  "rule_name": "Standard Institutional Credit Policy (2026)",
  "min_semester_credits": 12.0,
  "max_semester_credits": 26.0,
  "graduation_required_credits": 160.0,
  "honours_required_credits": 20.0,
  "minor_required_credits": 18.0,
  "max_elective_credits_per_sem": 12.0,
  "max_open_elective_credits_per_sem": 6.0,
  "is_active": true
}
```

*   **Response:** `200 OK`

---

## 5. Generate University Credit Reports

Generates compliance reports for Administrators, Deans, and Heads of Department.

*   **Endpoint:** `GET /api/credits/reports/:type`
*   **Report Types Supported:**
    *   `DEPARTMENT_CREDIT_SUMMARY`
    *   `STUDENT_CREDIT_REPORT`
    *   `GRADUATION_CREDIT_REPORT`
    *   `BACKLOG_CREDIT_REPORT`
    *   `CREDIT_DEFICIT_REPORT`
*   **Query Parameters:**
    *   `department` (optional): Filter report by department name.
    *   `semester` (optional): Filter report by semester index.
*   **Response:** `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "student_id": "student-1",
      "full_name": "Aarav Sharma",
      "department": "Computer Science",
      "earned_credits": 160.0,
      "graduation_progress_percentage": 100.0,
      "is_graduation_eligible": true
    }
  ]
}
```

---

## 6. Bulk Recalculate University Credits (Admin Automation)

Executes instant synchronization across selected student portfolios or the entire university.

*   **Endpoint:** `POST /api/credits/admin/bulk-recalculate`
*   **Request Body:**

```json
{
  "studentIds": ["student-1", "student-2"]
}
```
*(Passing an empty array `[]` syncs the active default batch).*

*   **Response:** `200 OK`

```json
{
  "status": "success",
  "message": "Synchronized 2 students",
  "data": [...]
}
```

---

## 7. Zero-Regression SGPA / CGPA Engine Compatibility

All existing endpoints remain 100% operational and backward-compatible:
*   `GET /api/credits/metrics/:studentId` (SGPA/CGPA history)
*   `POST /api/credits/recalculate/:studentId` (SGPA/CGPA recalculation + Phase 5 automation sync)
*   `GET /api/credits/transcript/:studentId` (Official Transcript generation)
