import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllData() {
  console.log('🔍 Verifying all course data...\n');

  // Count all tables
  const { count: coursesCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });

  const { count: subCoursesCount } = await supabase
    .from('sub_courses')
    .select('*', { count: 'exact', head: true });

  const { count: holesCount } = await supabase
    .from('holes')
    .select('*', { count: 'exact', head: true });

  const { count: teePositionsCount } = await supabase
    .from('tee_positions')
    .select('*', { count: 'exact', head: true });

  const { count: configurationsCount } = await supabase
    .from('course_configurations')
    .select('*', { count: 'exact', head: true });

  const { count: configLinksCount } = await supabase
    .from('configuration_sub_courses')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Total Counts:');
  console.log(`   ✅ courses: ${coursesCount}`);
  console.log(`   ✅ sub_courses: ${subCoursesCount}`);
  console.log(`   ✅ holes: ${holesCount}`);
  console.log(`   ✅ tee_positions: ${teePositionsCount}`);
  console.log(`   ✅ course_configurations: ${configurationsCount}`);
  console.log(`   ✅ configuration_sub_courses: ${configLinksCount}`);

  // Check relationships
  console.log('\n🔗 Checking Relationships:');

  // Check sub_courses -> courses
  const { data: orphanedSubCourses } = await supabase
    .from('sub_courses')
    .select('id, course_id')
    .is('course_id', null);

  if (orphanedSubCourses && orphanedSubCourses.length > 0) {
    console.log(`   ⚠️  ${orphanedSubCourses.length} sub_courses with null course_id`);
  } else {
    console.log('   ✅ All sub_courses have valid course_id');
  }

  // Check holes -> sub_courses
  const { data: orphanedHoles } = await supabase
    .from('holes')
    .select('id, sub_course_id')
    .is('sub_course_id', null);

  if (orphanedHoles && orphanedHoles.length > 0) {
    console.log(`   ⚠️  ${orphanedHoles.length} holes with null sub_course_id`);
  } else {
    console.log('   ✅ All holes have valid sub_course_id');
  }

  // Check tee_positions -> holes
  const { data: orphanedTees } = await supabase
    .from('tee_positions')
    .select('id, hole_id')
    .is('hole_id', null);

  if (orphanedTees && orphanedTees.length > 0) {
    console.log(`   ⚠️  ${orphanedTees.length} tee_positions with null hole_id`);
  } else {
    console.log('   ✅ All tee_positions have valid hole_id');
  }

  // Check course_configurations -> courses
  const { data: orphanedConfigs } = await supabase
    .from('course_configurations')
    .select('id, course_id')
    .is('course_id', null);

  if (orphanedConfigs && orphanedConfigs.length > 0) {
    console.log(`   ⚠️  ${orphanedConfigs.length} configurations with null course_id`);
  } else {
    console.log('   ✅ All configurations have valid course_id');
  }

  // Sample data
  console.log('\n📋 Sample Data:');

  const { data: sampleCourse } = await supabase
    .from('courses')
    .select('id, name, location')
    .limit(1)
    .single();

  if (sampleCourse) {
    console.log(`   Course: ${sampleCourse.name} (${sampleCourse.location})`);
    
    // Get related data
    const { count: relatedSubCourses } = await supabase
      .from('sub_courses')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', sampleCourse.id);

    const { count: relatedConfigs } = await supabase
      .from('course_configurations')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', sampleCourse.id);

    console.log(`   └─ ${relatedSubCourses} sub_courses`);
    console.log(`   └─ ${relatedConfigs} configurations`);
  }

  console.log('\n🎉 Verification complete!');
}

verifyAllData().catch(console.error);
