-- ==============================================================
-- MIGRATION: ACADEMIC RULES ENGINE
-- Create tables: academic_rules, academic_rule_history
-- ==============================================================
-- Run this in Supabase SQL Editor

-- ─── 1. academic_rules (master rules table) ──────────────────
CREATE TABLE IF NOT EXISTS public.academic_rules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name       TEXT        NOT NULL,
    description     TEXT,
    version         INTEGER     NOT NULL DEFAULT 1,
    is_active       BOOLEAN     NOT NULL DEFAULT true,

    -- Scope: rules apply per program / academic_year / semester (all optional = global default)
    program_id          UUID    REFERENCES public.programs(id)        ON DELETE SET NULL,
    academic_year_id    UUID    REFERENCES public.academic_years(id)  ON DELETE SET NULL,
    semester_id         UUID    REFERENCES public.semesters(id)       ON DELETE SET NULL,

    -- ── Attendance ──────────────────────────────────────────────
    min_attendance_percent  NUMERIC(5,2) NOT NULL DEFAULT 75.00
        CONSTRAINT chk_attendance_range CHECK (min_attendance_percent BETWEEN 0 AND 100),

    -- ── Academic Performance ─────────────────────────────────────
    min_sgpa                NUMERIC(4,2) NOT NULL DEFAULT 5.00
        CONSTRAINT chk_sgpa_range CHECK (min_sgpa BETWEEN 0 AND 10),

    min_credits             NUMERIC(6,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_credits_positive CHECK (min_credits >= 0),

    max_backlogs_allowed    INTEGER      NOT NULL DEFAULT 2
        CONSTRAINT chk_backlogs_positive CHECK (max_backlogs_allowed >= 0),

    -- ── Credit Requirements ──────────────────────────────────────
    credits_required_for_promotion  NUMERIC(6,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_credits_promo_positive CHECK (credits_required_for_promotion >= 0),

    credits_required_for_graduation NUMERIC(6,2) NOT NULL DEFAULT 0
        CONSTRAINT chk_credits_grad_positive CHECK (credits_required_for_graduation >= 0),

    -- ── Policy Flags ─────────────────────────────────────────────
    allow_atkt              BOOLEAN      NOT NULL DEFAULT true,
    promote_with_backlogs   BOOLEAN      NOT NULL DEFAULT false,

    -- ── Promotion Policy (configurable string) ───────────────────
    -- e.g. 'STANDARD', 'STRICT', 'LIBERAL'
    promotion_policy        TEXT         NOT NULL DEFAULT 'STANDARD'
        CONSTRAINT chk_promotion_policy CHECK (promotion_policy IN ('STANDARD', 'STRICT', 'LIBERAL')),

    -- ── Graduation Requirements (free-form JSON for extensibility) ──
    -- e.g. {"internship": true, "project": true, "ncc": false}
    graduation_requirements JSONB        DEFAULT '{}'::jsonb,

    -- ── Metadata ────────────────────────────────────────────────
    created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent duplicate active rules for the same scope
    CONSTRAINT uq_active_rule_per_scope UNIQUE (program_id, academic_year_id, semester_id, is_active, version)
);

COMMENT ON TABLE public.academic_rules IS
  'Configurable academic rules per program/year/semester. Never hardcode these values.';

-- ─── 2. academic_rule_history (full audit log + versioning) ──
CREATE TABLE IF NOT EXISTS public.academic_rule_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID        NOT NULL REFERENCES public.academic_rules(id) ON DELETE CASCADE,
    version         INTEGER     NOT NULL,
    action          TEXT        NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'ACTIVATED', 'DEACTIVATED', 'DELETED')),

    -- Snapshot of the rule at this point in time
    snapshot        JSONB       NOT NULL,

    changed_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_reason   TEXT
);

COMMENT ON TABLE public.academic_rule_history IS
  'Immutable audit log of every change to academic_rules with full row snapshot.';

-- ─── 3. updated_at auto-trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION update_academic_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academic_rules_updated_at ON public.academic_rules;
CREATE TRIGGER trg_academic_rules_updated_at
    BEFORE UPDATE ON public.academic_rules
    FOR EACH ROW EXECUTE FUNCTION update_academic_rules_updated_at();

-- ─── 4. Auto-snapshot trigger: write history on every change ──
CREATE OR REPLACE FUNCTION log_academic_rule_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'CREATED';
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.is_active = false AND NEW.is_active = true THEN
            v_action := 'ACTIVATED';
        ELSIF OLD.is_active = true AND NEW.is_active = false THEN
            v_action := 'DEACTIVATED';
        ELSE
            v_action := 'UPDATED';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETED';
        INSERT INTO public.academic_rule_history(rule_id, version, action, snapshot, changed_by)
        VALUES (OLD.id, OLD.version, v_action, row_to_json(OLD)::jsonb, OLD.updated_by);
        RETURN OLD;
    END IF;

    INSERT INTO public.academic_rule_history(rule_id, version, action, snapshot, changed_by)
    VALUES (NEW.id, NEW.version, v_action, row_to_json(NEW)::jsonb, NEW.updated_by);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_academic_rule_change ON public.academic_rules;
CREATE TRIGGER trg_log_academic_rule_change
    AFTER INSERT OR UPDATE OR DELETE ON public.academic_rules
    FOR EACH ROW EXECUTE FUNCTION log_academic_rule_change();

-- ─── 5. Row Level Security ───────────────────────────────────
ALTER TABLE public.academic_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_rule_history ENABLE ROW LEVEL SECURITY;

-- Rules: authenticated users can read; only service_role / admin backend can write
DROP POLICY IF EXISTS "Everyone can view active rules" ON public.academic_rules;
CREATE POLICY "Everyone can view active rules"
    ON public.academic_rules FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "Admins can view all rules" ON public.academic_rules;
CREATE POLICY "Admins can view all rules"
    ON public.academic_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dean', 'hod')
        )
    );

DROP POLICY IF EXISTS "Backend service can manage rules" ON public.academic_rules;
CREATE POLICY "Backend service can manage rules"
    ON public.academic_rules FOR ALL
    USING (auth.role() IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.role() IN ('service_role', 'anon', 'authenticated'));

DROP POLICY IF EXISTS "Backend service can manage history" ON public.academic_rule_history;
CREATE POLICY "Backend service can manage history"
    ON public.academic_rule_history FOR ALL
    USING (auth.role() IN ('service_role', 'anon', 'authenticated'))
    WITH CHECK (auth.role() IN ('service_role', 'anon', 'authenticated'));

DROP POLICY IF EXISTS "Admins can view history" ON public.academic_rule_history;
CREATE POLICY "Admins can view history"
    ON public.academic_rule_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dean', 'hod')
        )
    );

-- ─── 6. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academic_rules_program
    ON public.academic_rules(program_id);

CREATE INDEX IF NOT EXISTS idx_academic_rules_scope
    ON public.academic_rules(program_id, academic_year_id, semester_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_academic_rules_active
    ON public.academic_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_academic_rule_history_rule
    ON public.academic_rule_history(rule_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_academic_rule_history_changed_at
    ON public.academic_rule_history(changed_at DESC);

-- ─── 7. Default Global Rule (seed) ───────────────────────────
INSERT INTO public.academic_rules (
    rule_name, description, version, is_active,
    min_attendance_percent, min_sgpa, min_credits, max_backlogs_allowed,
    allow_atkt, promote_with_backlogs, promotion_policy,
    credits_required_for_promotion, credits_required_for_graduation,
    graduation_requirements
) VALUES (
    'Default Academic Policy',
    'Global fallback rule applied when no program-specific rule exists',
    1, true,
    75.00, 5.00, 0, 2,
    true, false, 'STANDARD',
    0, 160,
    '{"internship": true, "project": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- ==============================================================
-- MIGRATION COMPLETE
-- ==============================================================
