import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
  console.log('🔍 Checking exact counts and data integrity...\n');

  // Get all course_configurations with details
  const { data: configs, count: configCount } = await supabase
    .from('course_configurations')
    .select('id, course_id, name, created_at', { count: 'exact' })
    .order('created_at');

  console.log(`📊 course_configurations: ${configCount} total`);
  
  if (configs) {
    // Group by created date to see which were imported today
    const today = new Date().toISOString().split('T')[0];
    const todayConfigs = configs.filter(c => c.created_at?.startsWith(today));
    const olderConfigs = configs.filter(c => !c.created_at?.startsWith(today));

    console.log(`   - Imported today: ${todayConfigs.length}`);
    console.log(`   - Pre-existing: ${olderConfigs.length}`);

    if (todayConfigs.length > 0) {
      console.log('\n   Today\'s imports:');
      todayConfigs.forEach(c => {
        console.log(`   - ${c.name} (${c.id.substring(0, 8)}...)`);
      });
    }
  }

  // Get all configuration_sub_courses with details
  const { data: links, count: linkCount } = await supabase
    .from('configuration_sub_courses')
    .select('id, configuration_id, sub_course_id, created_at', { count: 'exact' })
    .order('created_at');

  console.log(`\n📊 configuration_sub_courses: ${linkCount} total`);
  
  if (links) {
    const today = new Date().toISOString().split('T')[0];
    const todayLinks = links.filter(l => l.created_at?.startsWith(today));
    const olderLinks = links.filter(l => !l.created_at?.startsWith(today));

    console.log(`   - Imported today: ${todayLinks.length}`);
    console.log(`   - Pre-existing: ${olderLinks.length}`);
  }

  // Check orphaned holes
  const { data: orphanedHoles, count: orphanCount } = await supabase
    .from('holes')
    .select('id, hole_number, course_id, created_at', { count: 'exact' })
    .is('sub_course_id', null);

  console.log(`\n⚠️  Orphaned holes (null sub_course_id): ${orphanCount}`);
  if (orphanedHoles && orphanedHoles.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const todayOrphans = orphanedHoles.filter(h => h.created_at?.startsWith(today));
    const olderOrphans = orphanedHoles.filter(h => !h.created_at?.startsWith(today));

    console.log(`   - From today's import: ${todayOrphans.length}`);
    console.log(`   - Pre-existing: ${olderOrphans.length}`);
  }

  console.log('\n✅ Count check complete');
}

checkCounts().catch(console.error);
