import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImport() {
  console.log('🔍 Verifying imported data...\n');

  const tables = [
    'courses',
    'sub_courses',
    'holes',
    'tee_positions'
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  }

  // Sample data check
  console.log('\n📋 Sample Data:');
  
  const { data: sampleCourses } = await supabase
    .from('courses')
    .select('id, name, location')
    .limit(3);

  console.log('\nCourses (first 3):');
  sampleCourses?.forEach(c => {
    console.log(`  - ${c.name} (${c.location})`);
  });

  const { data: sampleHoles } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par')
    .limit(5);

  console.log('\nHoles (first 5):');
  sampleHoles?.forEach(h => {
    console.log(`  - Hole ${h.hole_number}, Par ${h.par}`);
  });
}

verifyImport().catch(console.error);
