-- Run this script in the Supabase SQL Editor to bulk-generate 21 Batches per standard Year/Term
DO $$ 
DECLARE
    dept_id UUID;
    curr_year_id UUID;
    curr_sem_id UUID;
    y_lvl VARCHAR;
    term INT;
    batch_num INT;
BEGIN
    SELECT id INTO dept_id FROM public.departments WHERE code = 'COMP' LIMIT 1;
    
    IF dept_id IS NULL THEN 
        RAISE EXCEPTION 'Department COMP not found.';
    END IF;

    FOREACH y_lvl IN ARRAY ARRAY['FY', 'SY', 'TY', 'LY']
    LOOP
        SELECT id INTO curr_year_id FROM public.academic_years WHERE department_id = dept_id AND year_level = y_lvl;
        
        IF curr_year_id IS NOT NULL THEN
            FOR term IN 1..2 LOOP
                SELECT id INTO curr_sem_id FROM public.semesters WHERE academic_year_id = curr_year_id AND term_number = term;
                
                IF curr_sem_id IS NOT NULL THEN
                    
                    -- Generate 21 Batches natively
                    FOR batch_num IN 1..21 LOOP
                        INSERT INTO public.batches (semester_id, name, capacity) 
                        VALUES (curr_sem_id, y_lvl || ' ' || batch_num, 60)
                        ON CONFLICT (semester_id, name) DO NOTHING;
                    END LOOP;

                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;
