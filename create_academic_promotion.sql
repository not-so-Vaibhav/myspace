-- ==============================================================
-- MIGRATION: ACADEMIC PROMOTION ENGINE
-- Upgrade promotion_history & create notifications table
-- ==============================================================

-- ─── 1. Upgrade public.promotion_history ───────────────────────
DO $$
BEGIN
    -- Drop old restrictive constraint if present
    ALTER TABLE public.promotion_history DROP CONSTRAINT IF EXISTS promotion_history_decision_check;
    ALTER TABLE public.promotion_history DROP CONSTRAINT IF EXISTS chk_promotion_decision;
    ALTER TABLE public.promotion_history DROP CONSTRAINT IF EXISTS chk_promotion_destination;
    
    -- Add updated decision check constraint supporting Engine decisions
    ALTER TABLE public.promotion_history
        ADD CONSTRAINT chk_promotion_decision_extended CHECK (
            decision IN (
                'PROMOTED',
                'PROMOTED_WITH_ATKT',
                'REPEAT_SEMESTER',
                'DETAINED',
                'GRADUATED',
                'promoted',
                'held_back',
                'detained',
                'graduated',
                'withdrawn'
            )
        );

    -- Add evaluation metrics column (stores exact snapshot of attendance, SGPA, backlogs, rule criteria)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'promotion_history' AND column_name = 'evaluation_metrics'
    ) THEN
        ALTER TABLE public.promotion_history ADD COLUMN evaluation_metrics JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add approval_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'promotion_history' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.promotion_history 
            ADD COLUMN approval_status TEXT DEFAULT 'APPROVED' 
            CONSTRAINT chk_approval_status CHECK (approval_status IN ('AUTOMATIC', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'));
    END IF;

    -- Add academic_rule_id FK if not present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'promotion_history' AND column_name = 'academic_rule_id'
    ) THEN
        ALTER TABLE public.promotion_history ADD COLUMN academic_rule_id UUID REFERENCES public.academic_rules(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON TABLE public.promotion_history IS
  'Stores dynamic rule-based academic promotion decisions, metric snapshots, and approval status.';

-- ─── 2. Create public.notifications Table ──────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'PROMOTION',
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'In-app notification messages delivered to students and staff upon lifecycle & promotion events.';

-- ─── 3. Indexes & RLS ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_approval_status ON public.promotion_history(approval_status);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Backend service can insert notifications"
    ON public.notifications FOR ALL
    USING (auth.role() = 'service_role');

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
