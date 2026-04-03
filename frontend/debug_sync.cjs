const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables directly from frontend/.env
const envConfig = dotenv.parse(fs.readFileSync('./frontend/.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('full_name', '%Akash%');
  console.log('Akash profiles:', profiles);
  if (!profiles || profiles.length === 0) return;
  
  const akashId = profiles[0].id;
  
  const { data: allocations, error: allocError } = await supabase
      .from('subject_allocations')
      .select('id, subject:subjects(name, code), batch:batches(name), semester:semesters(term_number), faculty_id')
      .eq('faculty_id', akashId);
  console.log('Allocations for Akash:', JSON.stringify(allocations, null, 2), 'Error:', allocError);
  
  const { data: courses } = await supabase.from('courses').select('id, title, instructor_id').eq('instructor_id', akashId);
  console.log('Courses for Akash:', courses);
}

check().then(() => console.log('Done'));
