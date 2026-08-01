-- ==============================================================
-- MIGRATION: OPTIMIZED REPORTING VIEWS
-- ==============================================================
-- Creates highly optimized read-only views for analytics, 
-- dashboards, and transcript generation.
-- ==============================================================

-- 1. v_student_transcript
-- Complete granular view of every result for a student
CREATE OR REPLACE VIEW public.v_student_transcript AS
SELECT 
    r.id AS result_id,
    p.id AS student_id,
    p.full_name AS student_name,
    pr.code AS program_code,
    ay.label AS academic_year,
    sem.term_number AS semester,
    sub.code AS subject_code,
    sub.name AS subject_name,
    sub.credits AS subject_credits,
    r.internal_marks,
    r.external_marks,
    r.total_marks,
    r.grade,
    r.grade_points,
    r.result_status,
    r.credits_earned,
    r.exam_session,
    r.attempt_number,
    r.is_published
FROM public.student_results r
JOIN public.profiles p ON p.id = r.student_id
JOIN public.subjects sub ON sub.id = r.subject_id
JOIN public.semesters sem ON sem.id = r.semester_id
JOIN public.academic_years ay ON ay.id = sem.academic_year_id
LEFT JOIN public.programs pr ON pr.id = sub.program_id;


-- 2. v_student_cgpa
-- Aggregated view of a student's overall performance.
-- Uses Window Functions to only calculate based on the LATEST attempt per subject.
CREATE OR REPLACE VIEW public.v_student_cgpa AS
SELECT 
    student_id,
    student_name,
    program_code,
    SUM(credits_earned) AS total_credits_earned,
    SUM(pending_credits) AS total_pending_credits,
    -- Calculate CGPA: Sum(grade_points * subject_credits) / Sum(subject_credits)
    CASE 
        WHEN SUM(subject_credits) > 0 THEN 
            ROUND((SUM(grade_points * subject_credits) / SUM(subject_credits))::numeric, 2)
        ELSE 0.00
    END AS cgpa
FROM (
    SELECT 
        r.student_id,
        p.full_name AS student_name,
        pr.code AS program_code,
        r.subject_id,
        sub.credits AS subject_credits,
        r.credits_earned,
        CASE WHEN r.result_status != 'PASS' THEN sub.credits ELSE 0 END AS pending_credits,
        r.grade_points,
        -- rn = 1 means this is the most recent attempt for this specific subject
        ROW_NUMBER() OVER(PARTITION BY r.student_id, r.subject_id ORDER BY r.attempt_number DESC) as rn
    FROM public.student_results r
    JOIN public.profiles p ON p.id = r.student_id
    JOIN public.subjects sub ON sub.id = r.subject_id
    LEFT JOIN public.programs pr ON pr.id = sub.program_id
    WHERE r.is_published = TRUE
) latest_attempts
WHERE rn = 1
GROUP BY student_id, student_name, program_code;


-- 3. v_department_statistics
-- High-level KPI view for HODs and Deans
CREATE OR REPLACE VIEW public.v_department_statistics AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    d.code AS department_code,
    COUNT(DISTINCT c.student_id) AS total_active_students,
    ROUND(AVG(c.cgpa), 2) AS average_department_cgpa,
    SUM(c.total_credits_earned) AS total_credits_awarded
FROM public.departments d
JOIN public.programs pr ON pr.department_id = d.id
JOIN public.v_student_cgpa c ON c.program_code = pr.code
GROUP BY d.id, d.name, d.code;


-- 4. v_semester_statistics
-- Granular batch performance tracking (Pass rates, Average Scores)
CREATE OR REPLACE VIEW public.v_semester_statistics AS
SELECT 
    sem.id AS semester_id,
    ay.label AS academic_year,
    sem.term_number AS semester_term,
    pr.name AS program_name,
    COUNT(DISTINCT r.student_id) AS total_students_appeared,
    COUNT(DISTINCT CASE WHEN r.result_status = 'PASS' THEN r.student_id END) AS total_students_passed,
    COUNT(DISTINCT CASE WHEN r.result_status IN ('FAIL', 'ABSENT', 'MALPRACTICE') THEN r.student_id END) AS total_students_failed,
    CASE 
        WHEN COUNT(DISTINCT r.student_id) > 0 THEN
            ROUND((COUNT(DISTINCT CASE WHEN r.result_status = 'PASS' THEN r.student_id END)::numeric / 
                   COUNT(DISTINCT r.student_id)) * 100, 2)
        ELSE 0.00
    END AS pass_percentage,
    ROUND(AVG(r.grade_points), 2) AS average_grade_points
FROM public.student_results r
JOIN public.semesters sem ON sem.id = r.semester_id
JOIN public.academic_years ay ON ay.id = sem.academic_year_id
LEFT JOIN public.programs pr ON pr.id = sem.program_id
WHERE r.attempt_number = 1 -- Semester stats typically baseline on the First Regular Attempt
  AND r.is_published = TRUE
GROUP BY sem.id, ay.label, sem.term_number, pr.name;


-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
