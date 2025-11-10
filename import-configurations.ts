import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row: any = {};

    headers.forEach((header, index) => {
      let value = values[index]?.trim() || null;

      if (value === '' || value === 'null') {
        value = null;
      } else if (value && !isNaN(Number(value)) && value !== '') {
        value = Number(value);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      row[header] = value;
    });

    rows.push(row);
  }

  return rows;
}

async function importConfigurations() {
  console.log('🚀 Importing course configurations...\n');

  // Step 0: Get existing course IDs
  console.log('📊 Fetching existing courses from database...');
  const { data: existingCourses, error: courseError } = await supabase
    .from('courses')
    .select('id');

  if (courseError) {
    console.error('   ❌ Error fetching courses:', courseError.message);
    return;
  }

  const validCourseIds = new Set(existingCourses.map((c: any) => c.id));
  console.log(`   Found ${validCourseIds.size} courses in database\n`);

  // Step 1: Import course_configurations
  console.log('📊 Step 1: Importing course_configurations...');
  try {
    const configContent = readFileSync(
      'attached_assets/course_configurations-export-2025-11-05_16-57-11_1762339492227.csv',
      'utf-8'
    );
    const allConfigs = parseCSV(configContent);
    console.log(`   Found ${allConfigs.length} configurations in CSV`);

    // Filter out configurations with invalid course_ids
    const validConfigs = allConfigs.filter((config: any) => {
      if (!validCourseIds.has(config.course_id)) {
        console.log(`   ⚠️  Skipping config for missing course: ${config.course_id}`);
        return false;
      }
      return true;
    });

    console.log(`   Importing ${validConfigs.length} valid configurations...`);

    if (validConfigs.length === 0) {
      console.log('   ⚠️  No valid configurations to import');
      return;
    }

    const { data: configData, error: configError } = await supabase
      .from('course_configurations')
      .insert(validConfigs)
      .select();

    if (configError) {
      console.error('   ❌ Error:', configError.message);
      return;
    }

    console.log(`   ✅ Successfully imported ${validConfigs.length} course_configurations\n`);
  } catch (error: any) {
    console.error('   ❌ Error reading file:', error.message);
    return;
  }

  // Step 2: Get existing configuration IDs and sub_course IDs
  console.log('📊 Fetching configurations and sub_courses...');
  const { data: existingConfigs } = await supabase
    .from('course_configurations')
    .select('id');

  const { data: existingSubCourses } = await supabase
    .from('sub_courses')
    .select('id');

  const validConfigIds = new Set(existingConfigs?.map((c: any) => c.id) || []);
  const validSubCourseIds = new Set(existingSubCourses?.map((s: any) => s.id) || []);
  console.log(`   Found ${validConfigIds.size} configurations and ${validSubCourseIds.size} sub_courses\n`);

  // Step 3: Import configuration_sub_courses
  console.log('📊 Step 3: Importing configuration_sub_courses...');
  try {
    const linkContent = readFileSync(
      'attached_assets/configuration_sub_courses-export-2025-11-05_14-01-54_1762339492227.csv',
      'utf-8'
    );
    const allLinks = parseCSV(linkContent);
    console.log(`   Found ${allLinks.length} configuration links in CSV`);

    // Filter out links with invalid IDs
    const validLinks = allLinks.filter((link: any) => {
      if (!validConfigIds.has(link.configuration_id)) {
        console.log(`   ⚠️  Skipping link for missing configuration: ${link.configuration_id}`);
        return false;
      }
      if (!validSubCourseIds.has(link.sub_course_id)) {
        console.log(`   ⚠️  Skipping link for missing sub_course: ${link.sub_course_id}`);
        return false;
      }
      return true;
    });

    console.log(`   Importing ${validLinks.length} valid links...`);

    if (validLinks.length === 0) {
      console.log('   ⚠️  No valid links to import');
    } else {
      const { data: linkData, error: linkError } = await supabase
        .from('configuration_sub_courses')
        .insert(validLinks)
        .select();

      if (linkError) {
        console.error('   ❌ Error:', linkError.message);
        return;
      }

      console.log(`   ✅ Successfully imported ${validLinks.length} configuration_sub_courses\n`);
    }
  } catch (error: any) {
    console.error('   ❌ Error reading file:', error.message);
    return;
  }

  // Step 4: Verify
  console.log('📋 Final Verification:');
  const { count: configCount } = await supabase
    .from('course_configurations')
    .select('*', { count: 'exact', head: true });

  const { count: linkCount } = await supabase
    .from('configuration_sub_courses')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ course_configurations: ${configCount} rows`);
  console.log(`   ✅ configuration_sub_courses: ${linkCount} rows`);

  console.log('\n🎉 Import completed successfully!');
  console.log('\n💡 Note: Some configurations were skipped due to missing course references.');
}

importConfigurations().catch(console.error);
