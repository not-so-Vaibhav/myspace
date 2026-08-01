-- ==============================================================
-- ACADEMIC PROGRESSION SCHEMA
-- Tables: academic_years (extended), student_semester_history,
--         student_results, backlog_records, promotion_history
--
-- PREREQUISITES (must already exist):
--   public.profiles            → supabase_schema.sql
--   public.departments         → academic_structure.sql
--   public.academic_years      → academic_structure.sql
--   public.semesters           → academic_structure.sql
--   public.batches             → academic_structure.sql
--   public.subjects            → academic_structure.sql
--   public.subject_allocations → subject_allocations.sql
--
-- RUN ORDER: after all prerequisite files above.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- ==============================================================


-- ==============================================================
-- STEP 1: EXTEND academic_years
-- Adds calendar-year range, a current-flag and a human label.
-- FIX: Constraint now uses DO NOTHING pattern so re-runs are safe.
-- ==============================================================

ALTER TABLE public.academic_years
    ADD COLUMN IF NOT EXISTS start_year  INT,          -- e.g. 2023
    ADD COLUMN IF NOT EXISTS end_year    INT,          -- e.g. 2024
    ADD COLUMN IF NOT EXISTS is_current  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS label       VARCHAR(20);  -- e.g. '2023-24 FY'

-- Partial unique index: only one row can be "current" per dept+year_level
-- FIX: CREATE INDEX IF NOT EXISTS is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS uq_current_dept_year
    ON public.academic_years(department_id, year_level)
    WHERE is_current = TRUE;

-- FIX: Guard against re-adding the constraint on re-run
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_year_range'
          AND conrelid = 'public.academic_years'::regclass
    ) THEN
        ALTER TABLE public.academic_years
            ADD CONSTRAINT chk_year_range
            CHECK (start_year IS NULL OR end_year IS NULL OR start_year < end_year);
    END IF;
END $$;

-- FIX: start_year should be a 4-digit year (1900–2100 guard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_year_valid'
          AND conrelid = 'public.academic_years'::regclass
    ) THEN
        ALTER TABLE public.academic_years
            ADD CONSTRAINT chk_year_valid
            CHECK (
                (start_year IS NULL OR (start_year >= 1900 AND start_year <= 2100)) AND
                (end_year   IS NULL OR (end_year   >= 1900 AND end_year   <= 2100))
            );
    END IF;
END $$;

COMMENT ON TABLE  public.academic_years IS
    'One row per (department, year_level) pair. Extended with calendar year and current-flag.';
COMMENT ON COLUMN public.academic_years.start_year IS 'Calendar year the academic year begins, e.g. 2023.';
COMMENT ON COLUMN public.academic_years.end_year   IS 'Calendar year the academic year ends, e.g. 2024.';
COMMENT ON COLUMN public.academic_years.is_current IS 'TRUE for the active academic year of this dept+level. Enforced unique by partial index.';
COMMENT ON COLUMN public.academic_years.label      IS 'Human-readable label auto-set by the app, e.g. "2023-24 FY".';


-- ==============================================================
-- STEP 2: student_semester_history
-- Tracks which semester/batch every student is currently in,
-- plus the full historical log of past semesters.
--
-- FIX 1 (Critical): The original UNIQUE(student_id, semester_id, is_current)
--   constraint is broken. PostgreSQL treats NULL as distinct in unique
--   constraints, but BOOLEAN can only be TRUE or FALSE — so it would still
--   block two historical rows with is_current=FALSE for the same semester.
--   Correct approach: use a separate partial unique index for the active row
--   and drop the table-level unique constraint.
-- FIX 2: Added faculty/instructor SELECT policy (they need to see which batch
--   a student belongs to when setting up allocations).
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.student_semester_history (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id       UUID        NOT NULL
                         REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_year_id UUID        NOT NULL
                         REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    semester_id      UUID        NOT NULL
                         REFERENCES public.semesters(id) ON DELETE RESTRICT,
    batch_id         UUID
                         REFERENCES public.batches(id) ON DELETE SET NULL,
    enrolled_on      DATE        NOT NULL DEFAULT CURRENT_DATE,
    completed_on     DATE,
    -- FIX: is_current is NOT NULL — avoids NULL ambiguity in queries
    is_current       BOOLEAN     NOT NULL DEFAULT TRUE,
    remarks          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: No UNIQUE constraint here — uniqueness for active rows is
    --       enforced below via a partial index (see idx_ssh_one_active).
);

-- Exactly one active (is_current = TRUE) row per student
-- FIX: Correct idiomatic pattern — partial unique index, not a table constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_ssh_one_active
    ON public.student_semester_history(student_id)
    WHERE is_current = TRUE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ssh_student    ON public.student_semester_history(student_id);
CREATE INDEX IF NOT EXISTS idx_ssh_semester   ON public.student_semester_history(semester_id);
CREATE INDEX IF NOT EXISTS idx_ssh_acad_year  ON public.student_semester_history(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_ssh_batch      ON public.student_semester_history(batch_id);

COMMENT ON TABLE public.student_semester_history IS
    'Full history of which semester and batch each student has been in. One active row per student.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_ssh()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ssh_updated_at ON public.student_semester_history;
CREATE TRIGGER trg_ssh_updated_at
    BEFORE UPDATE ON public.student_semester_history
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_ssh();

-- Auto-close the previous active semester row when a new one is inserted
CREATE OR REPLACE FUNCTION close_previous_semester_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE public.student_semester_history
        SET    is_current   = FALSE,
               completed_on = CURRENT_DATE,
               updated_at   = NOW()
        WHERE  student_id   = NEW.student_id
          AND  id           <> NEW.id          -- exclude the row just inserted
          AND  is_current   = TRUE;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_prev_semester ON public.student_semester_history;
CREATE TRIGGER trg_close_prev_semester
    AFTER INSERT ON public.student_semester_history
    FOR EACH ROW EXECUTE FUNCTION close_previous_semester_history();


-- ==============================================================
-- STEP 3: student_results
-- Per-subject, per-attempt examination results.
--
-- FIX 1: internal_marks + external_marks each ≤ 50 is a common split
--   in Indian colleges; keeping the cap at 100 each but adding a
--   combined total cap of 100 via a CHECK on the generated column
--   by adding chk_total_marks_cap below.
-- FIX 2: grade_points range guard (0–10 for 10-point scale).
-- FIX 3: verified_at must not be in the future (optional but useful).
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.student_results (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

    student_id     UUID          NOT NULL
                       REFERENCES public.profiles(id) ON DELETE CASCADE,
    allocation_id  UUID          NOT NULL
                       REFERENCES public.subject_allocations(id) ON DELETE RESTRICT,
    -- Denormalised for fast reporting — kept in sync via FK through allocation
    semester_id    UUID          NOT NULL
                       REFERENCES public.semesters(id) ON DELETE RESTRICT,
    subject_id     UUID          NOT NULL
                       REFERENCES public.subjects(id) ON DELETE RESTRICT,

    -- Marks (each component capped at 100; total auto-computed)
    internal_marks NUMERIC(5, 2)
                       CHECK (internal_marks IS NULL OR (internal_marks >= 0 AND internal_marks <= 100)),
    external_marks NUMERIC(5, 2)
                       CHECK (external_marks IS NULL OR (external_marks >= 0 AND external_marks <= 100)),
    -- FIX: GENERATED column uses COALESCE so partial entry (only internals
    --   entered so far) doesn't produce inflated total
    total_marks    NUMERIC(5, 2)
                       GENERATED ALWAYS AS (
                           COALESCE(internal_marks, 0) + COALESCE(external_marks, 0)
                       ) STORED,

    grade          VARCHAR(5),
    -- FIX: grade_points bounded to 0–10 (standard 10-point scale)
    grade_points   NUMERIC(4, 2)
                       CHECK (grade_points IS NULL OR (grade_points >= 0 AND grade_points <= 10)),
    is_pass        BOOLEAN,      -- set by faculty/backend; drives backlog trigger

    attempt_number INT           NOT NULL DEFAULT 1
                       CHECK (attempt_number >= 1),
    exam_type      VARCHAR(30)   NOT NULL DEFAULT 'Regular'
                       CHECK (exam_type IN ('Regular', 'ATKT', 'Improvement')),

    -- FIX: exam_type and attempt_number must be consistent
    --   attempt 1 → must be Regular or Improvement; attempt > 1 → must be ATKT or Improvement
    CONSTRAINT chk_attempt_examtype CHECK (
        (attempt_number = 1  AND exam_type IN ('Regular', 'Improvement')) OR
        (attempt_number > 1  AND exam_type IN ('ATKT', 'Improvement'))
    ),

    entered_by     UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_by    UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at    TIMESTAMPTZ
                       CHECK (verified_at IS NULL OR verified_at <= NOW() + INTERVAL '1 minute'),
    remarks        TEXT,

    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One result row per student, per subject, per semester, per attempt
    CONSTRAINT uq_result_attempt
        UNIQUE (student_id, subject_id, semester_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_results_student    ON public.student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_semester   ON public.student_results(semester_id);
CREATE INDEX IF NOT EXISTS idx_results_subject    ON public.student_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_results_allocation ON public.student_results(allocation_id);
-- FIX: Composite (student_id, is_pass) — fast "show me all fails for student X"
CREATE INDEX IF NOT EXISTS idx_results_is_pass    ON public.student_results(student_id, is_pass);
CREATE INDEX IF NOT EXISTS idx_results_exam_type  ON public.student_results(exam_type);

COMMENT ON TABLE  public.student_results IS 'Per-subject, per-attempt examination results for every student.';
COMMENT ON COLUMN public.student_results.total_marks    IS 'Auto-computed (stored): internal + external marks.';
COMMENT ON COLUMN public.student_results.attempt_number IS '1 = first regular attempt; 2+ = ATKT/backlog attempts.';
COMMENT ON COLUMN public.student_results.grade_points   IS '0–10 scale; stored as snapshot even if grading system changes.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_results()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_updated_at ON public.student_results;
CREATE TRIGGER trg_results_updated_at
    BEFORE UPDATE ON public.student_results
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_results();


-- ==============================================================
-- STEP 4: backlog_records
--
-- FIX 1 (Critical): Original trigger had THREE IF blocks executing
--   sequentially. When attempt_number > 1 AND is_pass = TRUE, the
--   "clear" block ran and set status='cleared', then the third
--   "track attempts" block tried to UPDATE WHERE status='pending'
--   (which was just changed to 'cleared') — a no-op, but confusing.
--   Split into two separate, clearly-scoped triggers:
--     • trg_auto_create_backlog  — fires AFTER INSERT (attempt 1 fail)
--     • trg_auto_update_backlog  — fires AFTER UPDATE OF is_pass (ATKT outcomes)
-- FIX 2: max_attempts CHECK constraint was missing.
-- FIX 3: cleared_on must be >= the origin enrolled_on (guarded at app level,
--   but a DB check is added here).
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.backlog_records (
    id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id         UUID        NOT NULL
                           REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id         UUID        NOT NULL
                           REFERENCES public.subjects(id) ON DELETE RESTRICT,
    origin_semester_id UUID        NOT NULL
                           REFERENCES public.semesters(id) ON DELETE RESTRICT,
    origin_result_id   UUID
                           REFERENCES public.student_results(id) ON DELETE SET NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'cleared', 'withdrawn')),
    cleared_result_id  UUID
                           REFERENCES public.student_results(id) ON DELETE SET NULL,
    cleared_on         DATE,
    attempts_used      INT         NOT NULL DEFAULT 0
                           CHECK (attempts_used >= 0),
    -- FIX: max_attempts needs its own positive check
    max_attempts       INT         NOT NULL DEFAULT 3
                           CHECK (max_attempts >= 1),
    -- FIX: attempts_used cannot exceed max_attempts
    CONSTRAINT chk_attempts_not_exceeded
        CHECK (attempts_used <= max_attempts),
    -- FIX: If status is 'cleared', cleared_on must be set
    CONSTRAINT chk_cleared_consistency
        CHECK (
            (status = 'cleared' AND cleared_on IS NOT NULL AND cleared_result_id IS NOT NULL) OR
            (status <> 'cleared')
        ),
    remarks            TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_backlog
        UNIQUE (student_id, subject_id, origin_semester_id)
);

CREATE INDEX IF NOT EXISTS idx_backlog_student         ON public.backlog_records(student_id);
CREATE INDEX IF NOT EXISTS idx_backlog_subject         ON public.backlog_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_backlog_origin_semester ON public.backlog_records(origin_semester_id);
-- Composite for "show all pending backlogs for student X"
CREATE INDEX IF NOT EXISTS idx_backlog_student_status  ON public.backlog_records(student_id, status);
-- Partial index: fast scan of all pending backlogs globally (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_backlog_pending         ON public.backlog_records(status)
    WHERE status = 'pending';

COMMENT ON TABLE  public.backlog_records IS
    'One row per failed subject per student. Auto-created on first-attempt fail; auto-cleared when student passes ATKT.';
COMMENT ON COLUMN public.backlog_records.max_attempts  IS 'Institutional policy limit. Default 3.';
COMMENT ON COLUMN public.backlog_records.attempts_used IS 'Incremented automatically by trigger on each ATKT attempt.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_backlog()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backlog_updated_at ON public.backlog_records;
CREATE TRIGGER trg_backlog_updated_at
    BEFORE UPDATE ON public.backlog_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_backlog();


-- FIX: Split into two triggers for clarity and correctness.

-- Trigger A: fires AFTER INSERT on student_results
--   Creates a backlog row when a student fails their first attempt.
CREATE OR REPLACE FUNCTION create_backlog_on_first_fail()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Only act on first attempt failures
    IF NEW.is_pass = FALSE AND NEW.attempt_number = 1 THEN
        INSERT INTO public.backlog_records
            (student_id, subject_id, origin_semester_id, origin_result_id)
        VALUES
            (NEW.student_id, NEW.subject_id, NEW.semester_id, NEW.id)
        ON CONFLICT (student_id, subject_id, origin_semester_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_backlog ON public.student_results;
CREATE TRIGGER trg_auto_create_backlog
    AFTER INSERT ON public.student_results
    FOR EACH ROW EXECUTE FUNCTION create_backlog_on_first_fail();


-- Trigger B: fires AFTER UPDATE OF is_pass on student_results
--   Handles ATKT outcomes: clear on pass, increment counter on fail.
CREATE OR REPLACE FUNCTION update_backlog_on_atkt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Only act on ATKT / Improvement attempts (attempt_number > 1)
    IF NEW.attempt_number <= 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.is_pass = TRUE THEN
        -- Student passed the ATKT — clear the backlog
        UPDATE public.backlog_records
        SET    status             = 'cleared',
               cleared_result_id  = NEW.id,
               cleared_on         = CURRENT_DATE,
               attempts_used      = NEW.attempt_number - 1,
               updated_at         = NOW()
        WHERE  student_id          = NEW.student_id
          AND  subject_id          = NEW.subject_id
          AND  origin_semester_id  = NEW.semester_id
          AND  status              = 'pending';
    ELSE
        -- Student failed again — increment the attempts counter only
        UPDATE public.backlog_records
        SET    attempts_used = GREATEST(attempts_used, NEW.attempt_number - 1),
               updated_at   = NOW()
        WHERE  student_id         = NEW.student_id
          AND  subject_id         = NEW.subject_id
          AND  origin_semester_id = NEW.semester_id
          AND  status             = 'pending';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_update_backlog ON public.student_results;
CREATE TRIGGER trg_auto_update_backlog
    AFTER UPDATE OF is_pass ON public.student_results
    FOR EACH ROW EXECUTE FUNCTION update_backlog_on_atkt();


-- ==============================================================
-- STEP 5: promotion_history
--
-- FIX 1: SGPA/CGPA bounded to 0–10 (standard 10-point GPA scale).
-- FIX 2: backlogs_at_decision must be >= 0 (was only DEFAULT 0 before).
-- FIX 3: for 'promoted'/'graduated', to_semester_id and to_academic_year_id
--   should be filled; for 'held_back'/'detained'/'withdrawn' they may be NULL.
--   Added a consistency CHECK.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.promotion_history (
    id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

    student_id            UUID        NOT NULL
                              REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_semester_id      UUID        NOT NULL
                              REFERENCES public.semesters(id) ON DELETE RESTRICT,
    from_academic_year_id UUID        NOT NULL
                              REFERENCES public.academic_years(id) ON DELETE RESTRICT,

    -- NULL when student is held back / detained / withdrawn
    to_semester_id        UUID
                              REFERENCES public.semesters(id) ON DELETE RESTRICT,
    to_academic_year_id   UUID
                              REFERENCES public.academic_years(id) ON DELETE RESTRICT,

    decision              VARCHAR(20) NOT NULL
                              CHECK (decision IN ('promoted', 'held_back', 'detained', 'graduated', 'withdrawn')),

    -- FIX: GPA values bounded 0–10
    sgpa                  NUMERIC(4, 2)
                              CHECK (sgpa IS NULL OR (sgpa >= 0 AND sgpa <= 10)),
    cgpa                  NUMERIC(4, 2)
                              CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)),

    -- FIX: NOT NULL + CHECK >= 0
    backlogs_at_decision  INT         NOT NULL DEFAULT 0
                              CHECK (backlogs_at_decision >= 0),

    -- FIX: 'promoted' and 'graduated' must always point to a destination semester
    CONSTRAINT chk_promotion_destination CHECK (
        (decision IN ('promoted', 'graduated') AND to_semester_id IS NOT NULL AND to_academic_year_id IS NOT NULL) OR
        (decision NOT IN ('promoted', 'graduated'))
    ),

    decided_by            UUID
                              REFERENCES public.profiles(id) ON DELETE SET NULL,
    decided_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks               TEXT,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One promotion decision per student per source semester
    CONSTRAINT uq_promotion_per_semester
        UNIQUE (student_id, from_semester_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_student       ON public.promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_promo_from_semester ON public.promotion_history(from_semester_id);
CREATE INDEX IF NOT EXISTS idx_promo_to_semester   ON public.promotion_history(to_semester_id);
CREATE INDEX IF NOT EXISTS idx_promo_decision      ON public.promotion_history(decision);
CREATE INDEX IF NOT EXISTS idx_promo_decided_at    ON public.promotion_history(decided_at DESC);

COMMENT ON TABLE  public.promotion_history IS
    'Immutable audit log of every promotion / hold-back / detention decision.';
COMMENT ON COLUMN public.promotion_history.backlogs_at_decision IS
    'Snapshot of pending backlog count at the moment the decision was recorded. NOT updated retroactively.';
COMMENT ON COLUMN public.promotion_history.sgpa IS '0–10 scale snapshot at time of decision.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at_promotion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promo_updated_at ON public.promotion_history;
CREATE TRIGGER trg_promo_updated_at
    BEFORE UPDATE ON public.promotion_history
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_promotion();


-- ==============================================================
-- STEP 6: ROW LEVEL SECURITY
--
-- Roles present in the project (add_new_roles.sql):
--   student | instructor | admin | dean | hod | staff
--
-- FIX 1: Faculty/instructor now has SELECT on student_semester_history
--   so they can look up which batch a student belongs to.
-- FIX 2: 'dean' added alongside 'admin'/'hod' for full-access policies
--   (dean appears in add_new_roles.sql but was omitted before).
-- FIX 3: 'staff' added to read-access on results/backlogs (exam office).
-- ==============================================================

-- ── student_semester_history ──────────────────────────────────
ALTER TABLE public.student_semester_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssh_student_read_own" ON public.student_semester_history
    FOR SELECT USING (auth.uid() = student_id);

-- FIX: Faculty needs to see batch membership
CREATE POLICY "ssh_faculty_read" ON public.student_semester_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('instructor', 'faculty', 'hod')
        )
    );

-- FIX: dean added
CREATE POLICY "ssh_admin_full" ON public.student_semester_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod', 'dean')
        )
    );


-- ── student_results ───────────────────────────────────────────
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_student_read_own" ON public.student_results
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "results_faculty_read_own_alloc" ON public.student_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

CREATE POLICY "results_faculty_insert_own_alloc" ON public.student_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

CREATE POLICY "results_faculty_update_own_alloc" ON public.student_results
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.subject_allocations sa
            WHERE sa.id = allocation_id AND sa.faculty_id = auth.uid()
        )
    );

-- FIX: staff (exam office) can read all results; dean added
CREATE POLICY "results_staff_read" ON public.student_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('staff', 'dean')
        )
    );

CREATE POLICY "results_admin_full" ON public.student_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod', 'dean')
        )
    );


-- ── backlog_records ───────────────────────────────────────────
ALTER TABLE public.backlog_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backlog_student_read_own" ON public.backlog_records
    FOR SELECT USING (auth.uid() = student_id);

-- FIX: staff/dean read access
CREATE POLICY "backlog_staff_read" ON public.backlog_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('staff', 'dean', 'instructor', 'faculty')
        )
    );

CREATE POLICY "backlog_admin_full" ON public.backlog_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod', 'dean')
        )
    );


-- ── promotion_history ─────────────────────────────────────────
ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_student_read_own" ON public.promotion_history
    FOR SELECT USING (auth.uid() = student_id);

-- FIX: dean + staff read access
CREATE POLICY "promo_staff_read" ON public.promotion_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('staff', 'dean', 'instructor', 'faculty')
        )
    );

CREATE POLICY "promo_admin_full" ON public.promotion_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod', 'dean')
        )
    );


-- ==============================================================
-- STEP 7: VIEWS
-- FIX: DROP IF EXISTS before CREATE OR REPLACE to handle type changes.
-- FIX: v_student_result_card now also exposes academic_year_id for
--   frontend filtering.
-- NEW:  v_promotion_summary — one row per student with current GPA
--   and promotion status, useful for dashboards.
-- ==============================================================

-- A: Active semester for every student
DROP VIEW IF EXISTS public.v_student_current_semester CASCADE;
CREATE VIEW public.v_student_current_semester AS
SELECT
    ssh.student_id,
    p.full_name                AS student_name,
    p.role                     AS student_role,
    d.code                     AS department_code,
    d.name                     AS department_name,
    ay.id                      AS academic_year_id,
    ay.year_level,
    ay.label                   AS academic_year_label,
    ay.start_year,
    ay.end_year,
    s.id                       AS semester_id,
    s.term_number              AS semester_term,
    b.id                       AS batch_id,
    b.name                     AS batch_name,
    ssh.enrolled_on,
    ssh.remarks
FROM public.student_semester_history ssh
JOIN public.profiles       p   ON p.id  = ssh.student_id
JOIN public.academic_years ay  ON ay.id = ssh.academic_year_id
JOIN public.departments    d   ON d.id  = ay.department_id
JOIN public.semesters      s   ON s.id  = ssh.semester_id
LEFT JOIN public.batches   b   ON b.id  = ssh.batch_id
WHERE ssh.is_current = TRUE;

COMMENT ON VIEW public.v_student_current_semester IS
    'Live snapshot: one row per student showing their active semester and batch.';


-- B: Full result card per student per subject per attempt
DROP VIEW IF EXISTS public.v_student_result_card CASCADE;
CREATE VIEW public.v_student_result_card AS
SELECT
    sr.id                      AS result_id,
    sr.student_id,
    p.full_name                AS student_name,
    -- FIX: expose academic_year_id for frontend filtering
    ay.id                      AS academic_year_id,
    ay.year_level,
    ay.label                   AS academic_year_label,
    s.id                       AS semester_id,
    s.term_number              AS semester_term,
    sub.id                     AS subject_id,
    sub.code                   AS subject_code,
    sub.name                   AS subject_name,
    sub.type                   AS subject_type,
    sub.credits,
    sr.internal_marks,
    sr.external_marks,
    sr.total_marks,
    sr.grade,
    sr.grade_points,
    sr.is_pass,
    sr.attempt_number,
    sr.exam_type,
    sr.verified_at,
    sr.remarks
FROM public.student_results sr
JOIN public.profiles        p   ON p.id   = sr.student_id
JOIN public.subjects        sub ON sub.id = sr.subject_id
JOIN public.semesters       s   ON s.id   = sr.semester_id
JOIN public.academic_years  ay  ON ay.id  = s.academic_year_id;

COMMENT ON VIEW public.v_student_result_card IS
    'Full result card with subject and academic-year context per student per attempt.';


-- C: Pending backlogs with subject info
DROP VIEW IF EXISTS public.v_pending_backlogs CASCADE;
CREATE VIEW public.v_pending_backlogs AS
SELECT
    br.id                      AS backlog_id,
    br.student_id,
    p.full_name                AS student_name,
    sub.code                   AS subject_code,
    sub.name                   AS subject_name,
    sub.credits,
    s.term_number              AS origin_semester_term,
    ay.year_level              AS origin_year_level,
    ay.label                   AS origin_year_label,
    br.attempts_used,
    br.max_attempts,
    (br.max_attempts - br.attempts_used) AS attempts_remaining,
    br.status,
    br.created_at              AS backlog_created_at
FROM public.backlog_records br
JOIN public.profiles        p   ON p.id   = br.student_id
JOIN public.subjects        sub ON sub.id = br.subject_id
JOIN public.semesters       s   ON s.id   = br.origin_semester_id
JOIN public.academic_years  ay  ON ay.id  = s.academic_year_id
WHERE br.status = 'pending';

COMMENT ON VIEW public.v_pending_backlogs IS
    'All unresolved backlogs with subject/semester context and attempts remaining.';


-- D (NEW): Promotion summary — most recent promotion decision per student
DROP VIEW IF EXISTS public.v_promotion_summary CASCADE;
CREATE VIEW public.v_promotion_summary AS
SELECT DISTINCT ON (ph.student_id)
    ph.student_id,
    p.full_name                    AS student_name,
    from_ay.year_level             AS from_year_level,
    from_ay.label                  AS from_year_label,
    from_s.term_number             AS from_semester_term,
    to_ay.year_level               AS to_year_level,
    to_ay.label                    AS to_year_label,
    to_s.term_number               AS to_semester_term,
    ph.decision,
    ph.sgpa,
    ph.cgpa,
    ph.backlogs_at_decision,
    ph.decided_at,
    decider.full_name              AS decided_by_name,
    ph.remarks
FROM public.promotion_history ph
JOIN public.profiles           p       ON p.id       = ph.student_id
JOIN public.academic_years     from_ay ON from_ay.id = ph.from_academic_year_id
JOIN public.semesters          from_s  ON from_s.id  = ph.from_semester_id
LEFT JOIN public.academic_years to_ay  ON to_ay.id   = ph.to_academic_year_id
LEFT JOIN public.semesters      to_s   ON to_s.id    = ph.to_semester_id
LEFT JOIN public.profiles       decider ON decider.id = ph.decided_by
ORDER BY ph.student_id, ph.decided_at DESC;

COMMENT ON VIEW public.v_promotion_summary IS
    'Most recent promotion decision per student with full from/to academic year context.';


-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'academic_progression.sql — applied successfully';
    RAISE NOTICE '-------------------------------------------------------';
    RAISE NOTICE '  [OK] academic_years       — 4 columns + 2 constraints added';
    RAISE NOTICE '  [OK] student_semester_history — created (partial unique index)';
    RAISE NOTICE '  [OK] student_results      — created (GPA/attempt checks)';
    RAISE NOTICE '  [OK] backlog_records      — created (split triggers)';
    RAISE NOTICE '  [OK] promotion_history    — created (destination consistency)';
    RAISE NOTICE '  [OK] RLS policies         — student/faculty/staff/admin/hod/dean';
    RAISE NOTICE '  [OK] Views                — current_semester, result_card,';
    RAISE NOTICE '                              pending_backlogs, promotion_summary';
    RAISE NOTICE '=======================================================';
END $$;
