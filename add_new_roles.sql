-- Drop the existing constraint limiting roles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new check constraint allowing all our new expanded roles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'instructor', 'admin', 'dean', 'hod', 'staff'));
