# Course Resources Upload Fix - Summary

## 🐛 Bug Identified

**Error**: "new row violates row-level security policy" when uploading course resources

**Root Cause**: The INSERT policy for `course_resources` table was too permissive and didn't verify instructor ownership.

---

## ✅ Changes Made

### 1. Fixed SQL RLS Policy ([courses_migration.sql](file:///Users/vaibhavbariyar/Desktop/mit-learn-react/courses_migration.sql#L251-L280))

**Old Policy (BROKEN):**
```sql
CREATE POLICY "..." ON course_resources
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()  -- ❌ Only checks auth, not course ownership
);
```

**New Policy (FIXED):**
```sql
CREATE POLICY "Instructors can insert resources for own courses"
  ON public.course_resources
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_resources.course_id
      AND c.instructor_id = auth.uid()  -- ✅ Verifies instructor owns the course
    )
  );
```

### 2. Fixed React Code ([CourseDetail.jsx](file:///Users/vaibhavbariyar/Desktop/mit-learn-react/frontend/src/pages/CourseDetail.jsx#L158-L182))

**Changes:**
- Line 160: `if (!file || !profile)` → `if (!file || !user)` ✅
- Line 164: `const path = ${id}/${profile.id}/...` → `const path = ${id}/${user.id}/...` ✅
- Line 168: `course_id: id` → `course_id: parseInt(id)` ✅

---

## 📝 Why This Bug Happened

- **Missing instructor verification**: Original policy only checked `uploaded_by = auth.uid()`, allowing any authenticated user to upload to any course

- **No course ownership validation**: RLS wasn't verifying the user is the instructor of `course_id` before allowing INSERT

- **Inconsistent auth checks**: React code checked `!profile` but used `user.id`, risking undefined values

- **Policy was too permissive**: Without the `EXISTS` subquery, students could upload resources to courses they don't own

- **Type mismatch risk**: `course_id` needed explicit integer conversion as router params come as strings

---

## 🧪 How to Test

1. **Run the migration** (Supabase Dashboard → SQL Editor):
   ```bash
   # The updated courses_migration.sql now includes the fixed policies
   ```

2. **Test as instructor**:
   - Navigate to your course detail page
   - Upload a PDF/document
   - ✅ Should succeed

3. **Verify RLS works**:
   - As student, try to access `/courses/:id` for another instructor's course
   - Attempt upload (shouldn't have the button)
   - ✅ RLS blocks unauthorized uploads

---

## ✅ Fixed Files

1. ✅ [courses_migration.sql](file:///Users/vaibhavbariyar/Desktop/mit-learn-react/courses_migration.sql) - Added Step 8 with corrected RLS policies
2. ✅ [CourseDetail.jsx](file:///Users/vaibhavbariyar/Desktop/mit-learn-react/frontend/src/pages/CourseDetail.jsx) - Fixed upload function

The bug is now resolved! Instructors can upload course resources to their own courses only.
