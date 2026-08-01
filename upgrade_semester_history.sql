-- ==============================================================
-- MIGRATION: UPGRADE student_semester_history 
-- ==============================================================
-- Adds performance and credit tracking metrics to the semester
-- history table for advanced reporting and ranking.
-- ==============================================================

ALTER TABLE public.student_semester_history
    ADD COLUMN IF NOT EXISTS registered_credits NUMERIC(5,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS earned_credits NUMERIC(5,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS pending_credits NUMERIC(5,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS backlog_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS semester_rank INT;

-- Domain Constraints
ALTER TABLE public.student_semester_history
    ADD CONSTRAINT chk_history_credits 
        CHECK (registered_credits >= 0 AND earned_credits >= 0 AND pending_credits >= 0),
    ADD CONSTRAINT chk_history_backlog_count 
        CHECK (backlog_count >= 0),
    ADD CONSTRAINT chk_history_rank 
        CHECK (semester_rank IS NULL OR semester_rank > 0);

-- Existing Data Backfill (Zero Data Loss)
-- To avoid complex subqueries that might stall a large DB, we initialize 
-- the tracking columns to 0 for historical records. They can be back-calculated 
-- via a one-off batch script later if precise historical ranks are needed.
UPDATE public.student_semester_history
SET 
    registered_credits = 0.0,
    earned_credits = 0.0,
    pending_credits = 0.0,
    backlog_count = 0;

-- Performance Indexes
-- Useful for leaderboards (Top 10 ranks) or at-risk reports (High backlogs)
CREATE INDEX IF NOT EXISTS idx_sem_history_rank ON public.student_semester_history(semester_id, semester_rank) WHERE semester_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sem_history_backlogs ON public.student_semester_history(backlog_count) WHERE backlog_count > 0;

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
