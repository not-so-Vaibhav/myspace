-- ==============================================================
-- MIGRATION: REFACTOR BACKLOG & PROMOTION TRACKING
-- ==============================================================

-- --------------------------------------------------------------
-- 1. BACKLOG RECORDS REFACTOR
-- --------------------------------------------------------------

-- Add new columns safely
ALTER TABLE public.backlog_records
    ADD COLUMN IF NOT EXISTS failed_semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS cleared_semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

-- Remove the old unnamed CHECK constraint on status
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.backlog_records'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
          AND pg_get_constraintdef(oid) ILIKE '%pending%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.backlog_records DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- Safely migrate existing data to new columns and formatting
UPDATE public.backlog_records
SET 
    failed_semester_id = origin_semester_id,
    cleared_at = COALESCE(cleared_at, cleared_on::TIMESTAMPTZ),
    status = UPPER(status); -- 'pending' -> 'PENDING', 'cleared' -> 'CLEARED'

-- Apply new default and constraint
ALTER TABLE public.backlog_records
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ADD CONSTRAINT chk_backlog_status_new 
        CHECK (status IN ('PENDING', 'CLEARED', 'REPEATED', 'WITHDRAWN'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_backlogs_failed_sem ON public.backlog_records(failed_semester_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_cleared_sem ON public.backlog_records(cleared_semester_id);


-- --------------------------------------------------------------
-- 2. PROMOTION HISTORY REFACTOR
-- --------------------------------------------------------------

-- Add new columns safely
ALTER TABLE public.promotion_history
    -- academic_rules table is a future addition, so we add the UUID column without an FK constraint yet
    ADD COLUMN IF NOT EXISTS academic_rule_id UUID, 
    ADD COLUMN IF NOT EXISTS decision_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS decision_date TIMESTAMPTZ;

-- Backfill from existing data logically
UPDATE public.promotion_history
SET 
    decision_by = COALESCE(decision_by, decided_by),
    decision_date = COALESCE(decision_date, decided_at);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_promotion_academic_rule ON public.promotion_history(academic_rule_id);
CREATE INDEX IF NOT EXISTS idx_promotion_decision_by ON public.promotion_history(decision_by);

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
