-- Run this script in the Supabase SQL Editor to populate SY, TY, LY and standard batches!
DO $$ 
DECLARE
    dept_id UUID;
    curr_year_id UUID;
    curr_sem_id UUID;
    y_lvl VARCHAR;
    term INT;
BEGIN
    -- Fetch the Computer Engineering Department ID dynamically
    SELECT id INTO dept_id FROM public.departments WHERE code = 'COMP' LIMIT 1;
    
    IF dept_id IS NULL THEN 
        RAISE EXCEPTION 'Department COMP not found. Make sure you created it first.';
    END IF;

    -- Loop through all standard Academic Years
    FOREACH y_lvl IN ARRAY ARRAY['FY', 'SY', 'TY', 'LY']
    LOOP
        -- 1. Get or Insert Year Level
        SELECT id INTO curr_year_id FROM public.academic_years WHERE department_id = dept_id AND year_level = y_lvl;
        
        IF curr_year_id IS NULL THEN
            INSERT INTO public.academic_years (department_id, year_level) VALUES (dept_id, y_lvl) RETURNING id INTO curr_year_id;
        END IF;

        -- 2. Loop through Semesters (1 and 2 automatically created by trigger)
        FOR term IN 1..2 LOOP
            SELECT id INTO curr_sem_id FROM public.semesters WHERE academic_year_id = curr_year_id AND term_number = term;
            
            IF curr_sem_id IS NOT NULL THEN
                -- 3. Insert specific standard batches (e.g., SY 1, SY 2, SY 3)
                INSERT INTO public.batches (semester_id, name, capacity) VALUES 
                    (curr_sem_id, y_lvl || ' 1', 60),
                    (curr_sem_id, y_lvl || ' 2', 60),
                    (curr_sem_id, y_lvl || ' 3', 60)
                ON CONFLICT (semester_id, name) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;
