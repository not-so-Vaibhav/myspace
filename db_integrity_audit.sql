-- ==============================================================
-- DATABASE INTEGRITY & PERFORMANCE AUDIT
-- ==============================================================
-- Automatically scans the public schema and adds missing:
-- 1. UUID defaults for id columns
-- 2. NOW() defaults for created_at / updated_at
-- 3. RLS enablement on all tables (Supabase security)
-- 4. updated_at triggers for tracking modifications
-- 5. Foreign Key B-Tree indexes for fast joins/deletes
-- ==============================================================

DO $$
DECLARE
    r RECORD;
    idx_name TEXT;
    trigger_name TEXT;
    func_exists BOOLEAN;
BEGIN
    -- 0. Ensure uuid-ossp extension exists
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. UUID Primary Key Defaults
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'id' 
          AND data_type = 'uuid' 
          AND column_default IS NULL
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT uuid_generate_v4();', r.table_name, r.column_name);
        RAISE NOTICE 'Added UUID default to %.%', r.table_name, r.column_name;
    END LOOP;

    -- 2. created_at / updated_at defaults
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name IN ('created_at', 'updated_at') 
          AND column_default IS NULL
          AND data_type ILIKE 'timestamp%'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT NOW();', r.table_name, r.column_name);
        RAISE NOTICE 'Added DEFAULT NOW() to %.%', r.table_name, r.column_name;
    END LOOP;

    -- 3. Supabase RLS Compatibility
    FOR r IN (
        SELECT relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r' -- regular table
          AND c.relrowsecurity = false
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
        RAISE NOTICE 'Enabled RLS on public.%', r.table_name;
    END LOOP;

    -- 4. updated_at triggers
    -- First, ensure a generic trigger function exists
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_column') INTO func_exists;
    IF NOT func_exists THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION set_updated_at_column()
        RETURNS TRIGGER LANGUAGE plpgsql AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$;';
    END IF;

    FOR r IN (
        SELECT table_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    ) LOOP
        trigger_name := 'trg_' || r.table_name || '_updated_at';
        
        -- Check if trigger already exists on this table
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger t 
            JOIN pg_class c ON t.tgrelid = c.oid 
            JOIN pg_namespace n ON c.relnamespace = n.oid 
            WHERE n.nspname = 'public' AND c.relname = r.table_name AND t.tgname = trigger_name
        ) THEN
            EXECUTE format('
                CREATE TRIGGER %I
                BEFORE UPDATE ON public.%I
                FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();
            ', trigger_name, r.table_name);
            RAISE NOTICE 'Created updated_at trigger for %', r.table_name;
        END IF;
    END LOOP;

    -- 5. Foreign Key Indexes
    -- Iterate over all FK constraints
    FOR r IN (
        SELECT 
            c.conname AS constraint_name,
            t.relname AS table_name,
            a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'public' AND c.contype = 'f'
    ) LOOP
        -- Generate a safe index name: idx_[tablename]_[columnname]
        -- Truncate to 63 chars (PostgreSQL max identifier length)
        idx_name := SUBSTRING('idx_' || r.table_name || '_' || r.column_name FROM 1 FOR 63);
        
        -- Check if ANY index exists that starts with this column for this table
        IF NOT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = ( 'public.' || r.table_name )::regclass
              AND a.attname = r.column_name
        ) THEN
            -- Create the index if missing
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(%I);', idx_name, r.table_name, r.column_name);
            RAISE NOTICE 'Created FK index % ON %.%', idx_name, r.table_name, r.column_name;
        END IF;
    END LOOP;

END $$;
